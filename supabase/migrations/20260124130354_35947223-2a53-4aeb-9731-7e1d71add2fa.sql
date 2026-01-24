-- 1. Fix the handle_new_user function to not fail on referral code generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code VARCHAR(10);
  code_exists BOOLEAN;
BEGIN
  -- Generate unique referral code
  LOOP
    new_code := upper(substr(md5(random()::text || NEW.id::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Insert into users table with referral code
  INSERT INTO public.users (id, email, full_name, total_points, level, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    0,
    1,
    new_code
  );
  
  -- Create wallet for the user
  INSERT INTO public.wallets (user_id, available_points, locked_points)
  VALUES (NEW.id, 0, 0);
  
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- If there's a conflict, the user was already created
  RETURN NEW;
END;
$$;

-- 2. Drop the problematic trigger that duplicates referral code generation
DROP TRIGGER IF EXISTS generate_user_referral_code ON public.users;

-- 3. Fix overly permissive RLS policies on daily_activity_limits
DROP POLICY IF EXISTS "System can manage daily limits" ON public.daily_activity_limits;
DROP POLICY IF EXISTS "Users can view their own daily limits" ON public.daily_activity_limits;

CREATE POLICY "Users can view and manage their own daily limits"
ON public.daily_activity_limits
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Create a security definer function for daily limits to allow internal calls
CREATE OR REPLACE FUNCTION public.upsert_daily_activity(
  p_user_id UUID,
  p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, p_activity_date)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
END;
$$;

-- 5. Update check_daily_activity_limit to properly check limits
CREATE OR REPLACE FUNCTION public.check_daily_activity_limit(
  p_user_id UUID,
  p_activity_type TEXT,
  p_points_amount INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit RECORD;
  v_is_weekend BOOLEAN;
  v_has_campaign BOOLEAN;
  v_max_partnered_tasks INTEGER := 1;
  v_max_regular_tasks INTEGER := 2;
  v_max_surveys INTEGER := 3;
  v_max_videos INTEGER := 4;
  v_max_games INTEGER := 4;
  v_max_daily_points INTEGER := 180;
  v_current_limit INTEGER;
  v_max_limit INTEGER;
BEGIN
  -- Check if it's weekend
  v_is_weekend := EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6);
  
  -- Check if there's an active weekend campaign
  SELECT EXISTS(
    SELECT 1 FROM weekend_campaigns 
    WHERE is_active = true 
    AND CURRENT_DATE BETWEEN start_date AND end_date
  ) INTO v_has_campaign;
  
  -- Block activities on weekends without campaigns
  IF v_is_weekend AND NOT v_has_campaign THEN
    RETURN json_build_object(
      'allowed', false,
      'message', 'Weekend break! Tasks resume on Monday unless there''s a special campaign.',
      'is_weekend', true
    );
  END IF;
  
  -- Adjust limits based on campaign availability
  IF v_has_campaign THEN
    v_max_regular_tasks := 3;
    v_max_surveys := 3;
    v_max_videos := 4;
    v_max_games := 4;
  END IF;

  -- Get or create today's limits record
  PERFORM upsert_daily_activity(p_user_id, CURRENT_DATE);
  
  SELECT * INTO v_limit FROM daily_activity_limits 
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  -- Determine which limit to check
  CASE p_activity_type
    WHEN 'partnered_task', 'ai_task' THEN
      v_current_limit := COALESCE(v_limit.ai_tasks_completed, 0);
      v_max_limit := v_max_partnered_tasks;
    WHEN 'survey' THEN
      v_current_limit := COALESCE(v_limit.surveys_completed, 0);
      v_max_limit := v_max_surveys;
    WHEN 'video' THEN
      v_current_limit := COALESCE(v_limit.videos_watched, 0);
      v_max_limit := v_max_videos;
    WHEN 'game' THEN
      v_current_limit := COALESCE(v_limit.games_played, 0);
      v_max_limit := v_max_games;
    WHEN 'regular_task', 'task' THEN
      v_current_limit := COALESCE(v_limit.regular_tasks_completed, 0);
      v_max_limit := v_max_regular_tasks;
    ELSE
      RETURN json_build_object('allowed', false, 'message', 'Invalid activity type');
  END CASE;
  
  -- Check daily points cap
  IF COALESCE(v_limit.total_points_earned, 0) + p_points_amount > v_max_daily_points THEN
    RETURN json_build_object(
      'allowed', false,
      'message', 'Daily points limit of ' || v_max_daily_points || ' reached',
      'current_points', v_limit.total_points_earned,
      'max_points', v_max_daily_points
    );
  END IF;
  
  -- Check activity limit
  IF v_current_limit >= v_max_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'message', 'Daily limit for this activity reached (' || v_max_limit || ')',
      'current', v_current_limit,
      'max', v_max_limit
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'current', v_current_limit,
    'max', v_max_limit,
    'remaining', v_max_limit - v_current_limit,
    'points_remaining', v_max_daily_points - COALESCE(v_limit.total_points_earned, 0)
  );
END;
$$;

-- 6. Update get_daily_activity_status to return correct limits based on weekday/campaign
CREATE OR REPLACE FUNCTION public.get_daily_activity_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit RECORD;
  v_is_weekend BOOLEAN;
  v_has_campaign BOOLEAN;
  v_max_partnered INTEGER := 1;
  v_max_tasks INTEGER := 2;
  v_max_surveys INTEGER := 3;
  v_max_videos INTEGER := 4;
  v_max_games INTEGER := 4;
BEGIN
  -- Check if it's weekend
  v_is_weekend := EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6);
  
  -- Check if there's an active weekend campaign
  SELECT EXISTS(
    SELECT 1 FROM weekend_campaigns 
    WHERE is_active = true 
    AND CURRENT_DATE BETWEEN start_date AND end_date
  ) INTO v_has_campaign;
  
  -- Adjust limits for campaign
  IF v_has_campaign THEN
    v_max_tasks := 3;
  END IF;

  -- Get or create today's limits record
  PERFORM upsert_daily_activity(p_user_id, CURRENT_DATE);
  
  SELECT * INTO v_limit FROM daily_activity_limits 
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  RETURN json_build_object(
    'partnered_tasks', json_build_object(
      'completed', COALESCE(v_limit.ai_tasks_completed, 0), 
      'max', v_max_partnered, 
      'remaining', v_max_partnered - COALESCE(v_limit.ai_tasks_completed, 0)
    ),
    'regular_tasks', json_build_object(
      'completed', COALESCE(v_limit.regular_tasks_completed, 0), 
      'max', v_max_tasks, 
      'remaining', v_max_tasks - COALESCE(v_limit.regular_tasks_completed, 0)
    ),
    'surveys', json_build_object(
      'completed', COALESCE(v_limit.surveys_completed, 0), 
      'max', v_max_surveys, 
      'remaining', v_max_surveys - COALESCE(v_limit.surveys_completed, 0)
    ),
    'videos', json_build_object(
      'completed', COALESCE(v_limit.videos_watched, 0), 
      'max', v_max_videos, 
      'remaining', v_max_videos - COALESCE(v_limit.videos_watched, 0)
    ),
    'games', json_build_object(
      'completed', COALESCE(v_limit.games_played, 0), 
      'max', v_max_games, 
      'remaining', v_max_games - COALESCE(v_limit.games_played, 0)
    ),
    'total_points', json_build_object(
      'earned', COALESCE(v_limit.total_points_earned, 0), 
      'max', 180, 
      'remaining', 180 - COALESCE(v_limit.total_points_earned, 0)
    ),
    'is_weekend', v_is_weekend,
    'has_campaign', v_has_campaign
  );
END;
$$;

-- 7. Backfill null referral codes for existing users
UPDATE users SET referral_code = upper(substr(md5(id::text || random()::text), 1, 8))
WHERE referral_code IS NULL;