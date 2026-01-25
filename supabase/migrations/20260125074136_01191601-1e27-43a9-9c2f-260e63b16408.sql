-- Drop duplicate wallet trigger to prevent conflicts
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_wallet();

-- Update handle_new_user to be more robust with ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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

  -- Insert into users table with referral code (use ON CONFLICT to handle duplicates)
  INSERT INTO public.users (id, email, full_name, total_points, level, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    0,
    1,
    new_code
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create wallet for the user (use ON CONFLICT to handle duplicates)
  INSERT INTO public.wallets (user_id, available_points, locked_points)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update award_survey_points to also store survey response data
CREATE OR REPLACE FUNCTION public.award_survey_points(
  p_user_id UUID,
  p_points INTEGER,
  p_survey_title TEXT,
  p_survey_id TEXT DEFAULT NULL,
  p_questions JSONB DEFAULT '[]'::jsonb,
  p_responses JSONB DEFAULT '[]'::jsonb,
  p_completion_time INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_level INTEGER;
  v_user_vip TEXT;
  v_device_info JSONB;
BEGIN
  -- Get user info for demographic data
  SELECT level, vip_tier INTO v_user_level, v_user_vip
  FROM users WHERE id = p_user_id;

  -- Store survey response for monetization
  IF p_survey_id IS NOT NULL OR p_survey_title IS NOT NULL THEN
    INSERT INTO survey_responses (
      user_id,
      survey_id,
      survey_title,
      questions,
      responses,
      demographic_data,
      device_info,
      completion_time_seconds,
      points_awarded
    ) VALUES (
      p_user_id,
      COALESCE(p_survey_id, 'ai_' || gen_random_uuid()::text),
      p_survey_title,
      p_questions,
      p_responses,
      jsonb_build_object(
        'level', v_user_level,
        'vip_tier', v_user_vip,
        'completed_at', NOW()
      ),
      '{}'::jsonb,
      p_completion_time,
      p_points
    );
  END IF;

  -- Award points to wallet
  UPDATE wallets 
  SET available_points = available_points + p_points
  WHERE user_id = p_user_id;
  
  -- Update user total points
  UPDATE users 
  SET total_points = total_points + p_points
  WHERE id = p_user_id;
  
  -- Update daily limits
  INSERT INTO daily_activity_limits (user_id, activity_date, surveys_completed, total_points_earned)
  VALUES (p_user_id, CURRENT_DATE, 1, p_points)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET 
    surveys_completed = daily_activity_limits.surveys_completed + 1,
    total_points_earned = daily_activity_limits.total_points_earned + p_points,
    updated_at = NOW();
  
  -- Log transaction
  INSERT INTO transactions (user_id, points_amount, type, description, status)
  VALUES (p_user_id, p_points, 'survey_completion', 'Completed survey: ' || p_survey_title, 'completed');
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', p_points,
    'message', 'Points awarded successfully'
  );
END;
$$;

-- Ensure unique constraint on daily_activity_limits
ALTER TABLE daily_activity_limits 
DROP CONSTRAINT IF EXISTS daily_activity_limits_user_date_key;

ALTER TABLE daily_activity_limits 
ADD CONSTRAINT daily_activity_limits_user_date_key UNIQUE (user_id, activity_date);