-- =====================================================
-- COMPREHENSIVE FIX: Transaction constraints, column names, and RLS
-- =====================================================

-- 1. Drop the restrictive type constraint and add all valid transaction types
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (
  type IN (
    'earn',
    'cashout', 
    'withdrawal',
    'refund',
    'task_completion',
    'daily_bonus',
    'streak_recovery',
    'streak_milestone',
    'achievement',
    'referral_bonus',
    'survey_completion',
    'video_reward',
    'tier_upgrade',
    'redemption'
  )
);

-- 2. Add amount column as an alias (some functions use 'amount' instead of 'points_amount')
-- First check if column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount') THEN
    ALTER TABLE transactions ADD COLUMN amount integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'reference_id') THEN
    ALTER TABLE transactions ADD COLUMN reference_id uuid;
  END IF;
END $$;

-- 3. Create a trigger to sync amount and points_amount
CREATE OR REPLACE FUNCTION sync_transaction_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync the two columns
  IF NEW.amount IS NOT NULL AND NEW.points_amount IS NULL THEN
    NEW.points_amount := NEW.amount;
  ELSIF NEW.points_amount IS NOT NULL AND NEW.amount IS NULL THEN
    NEW.amount := NEW.points_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS sync_transaction_amounts_trigger ON transactions;
CREATE TRIGGER sync_transaction_amounts_trigger
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_transaction_amounts();

-- 4. Fix complete_video_watch function to use correct column names
CREATE OR REPLACE FUNCTION public.complete_video_watch(p_user_id uuid, p_video_id uuid, p_watch_duration integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_video RECORD;
  v_existing_view RECORD;
  v_points_to_award INTEGER;
BEGIN
  -- Get video details
  SELECT * INTO v_video FROM videos WHERE id = p_video_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Video not found');
  END IF;
  
  -- Check if already watched and completed
  SELECT * INTO v_existing_view FROM user_video_views 
  WHERE user_id = p_user_id AND video_id = p_video_id;
  
  IF FOUND AND v_existing_view.completed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already watched this video', 'already_completed', true);
  END IF;
  
  -- Calculate points (must watch at least 80% of video)
  IF p_watch_duration >= (v_video.duration_seconds * 0.8) THEN
    v_points_to_award := v_video.points_reward;
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Please watch the full video to earn points');
  END IF;
  
  -- Insert or update view record
  INSERT INTO user_video_views (user_id, video_id, watch_duration_seconds, completed, points_awarded)
  VALUES (p_user_id, p_video_id, p_watch_duration, true, v_points_to_award)
  ON CONFLICT (user_id, video_id) 
  DO UPDATE SET 
    watch_duration_seconds = EXCLUDED.watch_duration_seconds,
    completed = true,
    points_awarded = v_points_to_award,
    watched_at = now();
  
  -- Update video view count
  UPDATE videos SET view_count = view_count + 1 WHERE id = p_video_id;
  
  -- Award points to user wallet
  UPDATE wallets 
  SET available_points = available_points + v_points_to_award
  WHERE user_id = p_user_id;
  
  -- Update user total points
  UPDATE users 
  SET total_points = total_points + v_points_to_award
  WHERE id = p_user_id;
  
  -- Log transaction with correct column name
  INSERT INTO transactions (user_id, points_amount, type, description, reference_id, status)
  VALUES (p_user_id, v_points_to_award, 'video_reward', 'Watched video: ' || v_video.title, p_video_id, 'completed');
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Points awarded!', 
    'points', v_points_to_award,
    'video_title', v_video.title
  );
END;
$function$;

-- 5. Fix secure_complete_task function to use correct column names
CREATE OR REPLACE FUNCTION public.secure_complete_task(p_user_id uuid, p_task_id uuid, p_verification_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_task RECORD;
  v_existing RECORD;
  v_points_to_award INTEGER;
  v_daily_limit INTEGER := 5;
  v_tasks_today INTEGER;
  v_user_vip_tier TEXT;
  v_tier_bonus INTEGER := 0;
BEGIN
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Get task details
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task not found or inactive');
  END IF;
  
  -- Check if already completed
  SELECT * INTO v_existing FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id;
  
  IF FOUND AND v_existing.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task already completed', 'already_completed', true);
  END IF;
  
  -- Get user's VIP tier for daily limit bonus
  SELECT vip_tier INTO v_user_vip_tier FROM users WHERE id = p_user_id;
  
  IF v_user_vip_tier IS NOT NULL THEN
    SELECT COALESCE(daily_task_bonus, 0) INTO v_tier_bonus 
    FROM vip_tiers WHERE slug = v_user_vip_tier;
  END IF;
  
  v_daily_limit := v_daily_limit + COALESCE(v_tier_bonus, 0);
  
  -- Check daily task limit
  SELECT COUNT(*) INTO v_tasks_today 
  FROM user_tasks 
  WHERE user_id = p_user_id 
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;
  
  IF v_tasks_today >= v_daily_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily task limit reached');
  END IF;
  
  -- Validate verification based on type
  CASE v_task.verification_type
    WHEN 'timer' THEN
      NULL; -- Be lenient with timer tasks
    WHEN 'url' THEN
      IF p_verification_data->>'submitted_url' IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'URL submission required');
      END IF;
    WHEN 'screenshot' THEN
      IF p_verification_data->>'file_path' IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Screenshot submission required');
      END IF;
    ELSE
      NULL; -- instant, survey, ai_survey - no additional validation needed
  END CASE;
  
  v_points_to_award := v_task.points_reward;
  
  -- Insert or update user_tasks
  INSERT INTO user_tasks (user_id, task_id, status, completed_at, verification_data, points_earned)
  VALUES (p_user_id, p_task_id, 'completed', now(), p_verification_data, v_points_to_award)
  ON CONFLICT (user_id, task_id) 
  DO UPDATE SET 
    status = 'completed',
    completed_at = now(),
    verification_data = p_verification_data,
    points_earned = v_points_to_award;
  
  -- Award points to wallet
  UPDATE wallets 
  SET available_points = available_points + v_points_to_award
  WHERE user_id = p_user_id;
  
  -- Update user total points
  UPDATE users 
  SET total_points = total_points + v_points_to_award
  WHERE id = p_user_id;
  
  -- Log transaction with correct column name
  INSERT INTO transactions (user_id, points_amount, type, description, reference_id, status)
  VALUES (p_user_id, v_points_to_award, 'task_completion', 'Completed task: ' || v_task.title, p_task_id, 'completed');
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Task completed!', 
    'points', v_points_to_award,
    'task_title', v_task.title
  );
END;
$function$;

-- 6. Fix the create_transaction function to return uuid and use correct types
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id uuid, 
  p_type character varying, 
  p_points_amount integer, 
  p_description text, 
  p_status character varying DEFAULT 'completed'::character varying
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, p_type, p_points_amount, p_description, p_status)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$function$;

-- 7. Create a comprehensive award_points function for surveys and other uses
CREATE OR REPLACE FUNCTION public.award_survey_points(
  p_user_id uuid,
  p_points integer,
  p_survey_title text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award points to wallet
  UPDATE wallets 
  SET available_points = available_points + p_points
  WHERE user_id = p_user_id;
  
  -- Update user total points
  UPDATE users 
  SET total_points = total_points + p_points
  WHERE id = p_user_id;
  
  -- Log transaction
  INSERT INTO transactions (user_id, points_amount, type, description, status)
  VALUES (p_user_id, p_points, 'survey_completion', 'Completed survey: ' || p_survey_title, 'completed');
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', p_points,
    'message', 'Points awarded successfully'
  );
END;
$function$;

-- 8. Add unique constraint on user_video_views if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_video_views_user_video_unique'
  ) THEN
    ALTER TABLE user_video_views ADD CONSTRAINT user_video_views_user_video_unique UNIQUE (user_id, video_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

-- 9. Fix check_login_streak to use correct transaction type
CREATE OR REPLACE FUNCTION public.check_login_streak(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    last_login DATE;
    curr_streak INTEGER;
    max_streak INTEGER;
    today_date DATE := CURRENT_DATE;
    bonus_points INTEGER := 0;
    result JSON;
BEGIN
    -- Get current user streak data
    SELECT last_login_date, current_streak, longest_streak 
    INTO last_login, curr_streak, max_streak
    FROM users 
    WHERE id = p_user_id;
    
    -- Initialize if null
    IF curr_streak IS NULL THEN curr_streak := 0; END IF;
    IF max_streak IS NULL THEN max_streak := 0; END IF;
    
    -- Check if already logged in today
    IF last_login = today_date THEN
        result := json_build_object(
            'claimed', FALSE,
            'already_claimed_today', TRUE,
            'current_streak', curr_streak,
            'longest_streak', max_streak,
            'bonus_points', 0
        );
        RETURN result;
    END IF;
    
    -- Check streak logic
    IF last_login = today_date - INTERVAL '1 day' THEN
        curr_streak := curr_streak + 1;
    ELSIF last_login IS NULL OR last_login < today_date - INTERVAL '1 day' THEN
        curr_streak := 1;
    END IF;
    
    -- Update longest streak if needed
    IF curr_streak > max_streak THEN
        max_streak := curr_streak;
    END IF;
    
    -- Calculate bonus points based on streak
    bonus_points := 5 + (LEAST(curr_streak, 30) / 7) * 5;
    
    -- Update user record
    UPDATE users 
    SET last_login_date = today_date,
        current_streak = curr_streak,
        longest_streak = max_streak
    WHERE id = p_user_id;
    
    -- Award bonus points
    UPDATE wallets 
    SET available_points = available_points + bonus_points
    WHERE user_id = p_user_id;
    
    UPDATE users 
    SET total_points = total_points + bonus_points
    WHERE id = p_user_id;
    
    -- Record transaction with correct type
    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (p_user_id, 'daily_bonus', bonus_points, 
            'Day ' || curr_streak || ' login streak bonus', 'completed');
    
    result := json_build_object(
        'claimed', TRUE,
        'already_claimed_today', FALSE,
        'current_streak', curr_streak,
        'longest_streak', max_streak,
        'bonus_points', bonus_points
    );
    
    RETURN result;
END;
$function$;

-- 10. Fix recover_streak function
CREATE OR REPLACE FUNCTION public.recover_streak(p_user_id uuid, p_recovery_cost integer DEFAULT 50)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    last_login DATE;
    curr_streak INTEGER;
    max_streak INTEGER;
    available_pts INTEGER;
    today_date DATE := CURRENT_DATE;
    result JSON;
BEGIN
    SELECT last_login_date, current_streak, longest_streak
    INTO last_login, curr_streak, max_streak
    FROM users 
    WHERE id = p_user_id;
    
    SELECT available_points INTO available_pts
    FROM wallets
    WHERE user_id = p_user_id;
    
    IF last_login IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'no_streak_to_recover', 'message', 'No streak to recover');
    END IF;
    
    IF last_login = today_date THEN
        RETURN json_build_object('success', FALSE, 'error', 'streak_not_broken', 'message', 'Streak is not broken');
    END IF;
    
    IF last_login = today_date - INTERVAL '1 day' THEN
        RETURN json_build_object('success', FALSE, 'error', 'streak_still_active', 'message', 'Streak is still active');
    END IF;
    
    IF last_login < today_date - INTERVAL '2 days' THEN
        RETURN json_build_object('success', FALSE, 'error', 'streak_too_old', 'message', 'Streak expired - can only recover within 48 hours');
    END IF;
    
    IF available_pts < p_recovery_cost THEN
        RETURN json_build_object('success', FALSE, 'error', 'insufficient_points', 'message', 'Not enough points');
    END IF;
    
    -- Deduct points
    UPDATE wallets SET available_points = available_points - p_recovery_cost WHERE user_id = p_user_id;
    
    -- Update last login to yesterday
    UPDATE users SET last_login_date = today_date - INTERVAL '1 day' WHERE id = p_user_id;
    
    -- Record transaction with correct type
    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (p_user_id, 'streak_recovery', -p_recovery_cost, 'Streak recovery - saved ' || curr_streak || ' day streak', 'completed');
    
    RETURN json_build_object('success', TRUE, 'message', 'Streak recovered!', 'recovered_streak', curr_streak, 'points_spent', p_recovery_cost);
END;
$function$;

-- 11. Fix check_streak_milestones
CREATE OR REPLACE FUNCTION public.check_streak_milestones(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_streak integer;
  awarded_milestones json[] := '{}';
  total_bonus integer := 0;
  milestones integer[] := ARRAY[7, 14, 30];
  bonus_amounts integer[] := ARRAY[50, 100, 250];
  i integer;
BEGIN
  SELECT current_streak INTO user_streak FROM users WHERE id = p_user_id;
  
  IF user_streak IS NULL THEN
    RETURN json_build_object('milestones_awarded', '[]'::json, 'total_bonus', 0);
  END IF;
  
  FOR i IN 1..array_length(milestones, 1) LOOP
    IF user_streak >= milestones[i] THEN
      IF NOT EXISTS (
        SELECT 1 FROM streak_milestones 
        WHERE user_id = p_user_id AND milestone_days = milestones[i]
      ) THEN
        INSERT INTO streak_milestones (user_id, milestone_days, bonus_points)
        VALUES (p_user_id, milestones[i], bonus_amounts[i]);
        
        UPDATE wallets SET available_points = available_points + bonus_amounts[i]
        WHERE wallets.user_id = p_user_id;
        
        UPDATE users SET total_points = total_points + bonus_amounts[i]
        WHERE id = p_user_id;
        
        INSERT INTO transactions (user_id, type, points_amount, description, status)
        VALUES (p_user_id, 'streak_milestone', bonus_amounts[i], 
                milestones[i] || ' day streak milestone bonus!', 'completed');
        
        awarded_milestones := awarded_milestones || json_build_object('days', milestones[i], 'bonus', bonus_amounts[i]);
        total_bonus := total_bonus + bonus_amounts[i];
      END IF;
    END IF;
  END LOOP;
  
  RETURN json_build_object('milestones_awarded', to_json(awarded_milestones), 'total_bonus', total_bonus);
END;
$function$;

-- 12. Fix purchase_tier_upgrade
CREATE OR REPLACE FUNCTION public.purchase_tier_upgrade(p_user_id uuid, p_target_tier character varying)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    current_tier_slug varchar;
    target_tier_data RECORD;
    current_tier_data RECORD;
    available_pts integer;
BEGIN
    SELECT vip_tier INTO current_tier_slug FROM users WHERE id = p_user_id;
    
    SELECT * INTO target_tier_data FROM vip_tiers WHERE slug = p_target_tier;
    
    IF target_tier_data IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'invalid_tier', 'message', 'Invalid tier');
    END IF;
    
    SELECT * INTO current_tier_data FROM vip_tiers WHERE slug = current_tier_slug;
    
    IF current_tier_data.min_points >= target_tier_data.min_points THEN
        RETURN json_build_object('success', false, 'error', 'already_at_tier', 'message', 'Already at this tier or higher');
    END IF;
    
    SELECT available_points INTO available_pts FROM wallets WHERE user_id = p_user_id;
    
    IF available_pts < target_tier_data.upgrade_cost THEN
        RETURN json_build_object('success', false, 'error', 'insufficient_points', 'message', 'Not enough points');
    END IF;
    
    UPDATE wallets SET available_points = available_points - target_tier_data.upgrade_cost WHERE user_id = p_user_id;
    
    UPDATE users SET vip_tier = p_target_tier WHERE id = p_user_id;
    
    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (p_user_id, 'tier_upgrade', -target_tier_data.upgrade_cost, 'Upgraded to ' || target_tier_data.name || ' tier', 'completed');
    
    RETURN json_build_object(
        'success', true,
        'message', 'Welcome to ' || target_tier_data.name || ' tier!',
        'new_tier', p_target_tier,
        'points_spent', target_tier_data.upgrade_cost,
        'daily_task_bonus', target_tier_data.daily_task_bonus
    );
END;
$function$;

-- 13. Fix check_and_award_achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    tasks_count INTEGER;
    total_pts INTEGER;
    referrals_count INTEGER;
    user_level INTEGER;
    user_streak INTEGER;
    achievement_record RECORD;
    awarded_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO tasks_count FROM user_tasks WHERE user_id = p_user_id AND status = 'completed';
    SELECT COALESCE(total_points, 0), COALESCE(level, 1), COALESCE(current_streak, 0)
    INTO total_pts, user_level, user_streak FROM users WHERE id = p_user_id;
    SELECT COUNT(*) INTO referrals_count FROM referrals WHERE referrer_id = p_user_id;
    
    FOR achievement_record IN SELECT * FROM achievements WHERE is_active = true LOOP
        IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = achievement_record.id) THEN
            CONTINUE;
        END IF;
        
        IF (achievement_record.requirement_type = 'tasks_completed' AND tasks_count >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'points_earned' AND total_pts >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'referrals_made' AND referrals_count >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'level_reached' AND user_level >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'streak_days' AND user_streak >= achievement_record.requirement_value)
        THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_record.id);
            
            IF achievement_record.points_reward > 0 THEN
                UPDATE wallets SET available_points = available_points + achievement_record.points_reward WHERE wallets.user_id = p_user_id;
                UPDATE users SET total_points = total_points + achievement_record.points_reward WHERE id = p_user_id;
                
                INSERT INTO transactions (user_id, type, points_amount, description, status)
                VALUES (p_user_id, 'achievement', achievement_record.points_reward, 'Achievement unlocked: ' || achievement_record.name, 'completed');
            END IF;
            
            awarded_count := awarded_count + 1;
        END IF;
    END LOOP;
    
    RETURN awarded_count;
END;
$function$;