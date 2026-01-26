-- Fix complete_ai_partner_task to properly enforce AND increment daily activity limits
CREATE OR REPLACE FUNCTION public.complete_ai_partner_task(
  p_user_id UUID,
  p_task_type TEXT,
  p_task_title TEXT,
  p_points_amount INTEGER,
  p_source TEXT DEFAULT 'ai'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_balance INTEGER;
  v_current_total_points INTEGER;
  v_activity_check JSON;
  v_transaction_id UUID;
  v_max_points INTEGER := 100; -- Maximum points per AI/partner task
  v_is_weekend BOOLEAN;
  v_has_campaign BOOLEAN;
  v_activity_type TEXT;
BEGIN
  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Validate points amount (prevent exploitation)
  IF p_points_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Invalid points amount');
  END IF;

  -- Cap the maximum points that can be awarded
  IF p_points_amount > v_max_points THEN
    p_points_amount := v_max_points;
  END IF;

  -- Determine activity type based on source
  IF p_source = 'partner' OR p_source = 'ai' THEN
    v_activity_type := 'partnered_task';
  ELSE
    v_activity_type := 'regular_task';
  END IF;

  -- Check daily activity limit (this includes weekend check)
  v_activity_check := check_daily_activity_limit(p_user_id, v_activity_type, p_points_amount);
  IF NOT (v_activity_check->>'allowed')::boolean THEN
    RETURN json_build_object(
      'success', false, 
      'message', COALESCE(v_activity_check->>'message', 'Daily limit reached. Come back tomorrow!')
    );
  END IF;

  -- Create transaction record
  INSERT INTO public.transactions (
    user_id, 
    type, 
    points_amount, 
    description, 
    status
  ) VALUES (
    p_user_id, 
    'task_completion', 
    p_points_amount, 
    CONCAT('Completed ', p_source, ' task: ', p_task_title),
    'completed'
  ) RETURNING id INTO v_transaction_id;

  -- Update wallet
  UPDATE public.wallets
  SET available_points = COALESCE(available_points, 0) + p_points_amount
  WHERE user_id = p_user_id;

  -- If wallet doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, available_points)
    VALUES (p_user_id, p_points_amount);
  END IF;

  -- Update user total points
  UPDATE public.users
  SET total_points = COALESCE(total_points, 0) + p_points_amount
  WHERE id = p_user_id
  RETURNING total_points INTO v_current_total_points;

  -- Increment the daily activity counter
  PERFORM increment_daily_activity(p_user_id, v_activity_type, p_points_amount);

  RETURN json_build_object(
    'success', true,
    'message', 'Task completed successfully',
    'points_awarded', p_points_amount,
    'new_total_points', v_current_total_points,
    'transaction_id', v_transaction_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'An error occurred: ' || SQLERRM
    );
END;
$$;

-- Fix the handle_new_user function to avoid any conflicts
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
  INSERT INTO public.users (id, email, full_name, total_points, level, referral_code, vip_tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    0,
    1,
    new_code,
    'bronze'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name);
  
  -- Create wallet for the user (use ON CONFLICT to handle duplicates)
  INSERT INTO public.wallets (user_id, available_points, locked_points)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure increment_daily_activity properly handles partnered_task type
CREATE OR REPLACE FUNCTION public.increment_daily_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_points_amount INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure we have a record for today
  PERFORM upsert_daily_activity(p_user_id, CURRENT_DATE);
  
  -- Increment based on activity type
  CASE p_activity_type
    WHEN 'partnered_task', 'ai_task' THEN
      UPDATE daily_activity_limits 
      SET 
        ai_tasks_completed = COALESCE(ai_tasks_completed, 0) + 1,
        total_points_earned = COALESCE(total_points_earned, 0) + p_points_amount,
        updated_at = now()
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    WHEN 'survey' THEN
      UPDATE daily_activity_limits 
      SET 
        surveys_completed = COALESCE(surveys_completed, 0) + 1,
        total_points_earned = COALESCE(total_points_earned, 0) + p_points_amount,
        updated_at = now()
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    WHEN 'video' THEN
      UPDATE daily_activity_limits 
      SET 
        videos_watched = COALESCE(videos_watched, 0) + 1,
        total_points_earned = COALESCE(total_points_earned, 0) + p_points_amount,
        updated_at = now()
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    WHEN 'game' THEN
      UPDATE daily_activity_limits 
      SET 
        games_played = COALESCE(games_played, 0) + 1,
        total_points_earned = COALESCE(total_points_earned, 0) + p_points_amount,
        updated_at = now()
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    WHEN 'regular_task', 'task' THEN
      UPDATE daily_activity_limits 
      SET 
        regular_tasks_completed = COALESCE(regular_tasks_completed, 0) + 1,
        total_points_earned = COALESCE(total_points_earned, 0) + p_points_amount,
        updated_at = now()
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    ELSE
      -- Default to regular task
      UPDATE daily_activity_limits 
      SET 
        regular_tasks_completed = COALESCE(regular_tasks_completed, 0) + 1,
        total_points_earned = COALESCE(total_points_earned, 0) + p_points_amount,
        updated_at = now()
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  END CASE;
END;
$$;