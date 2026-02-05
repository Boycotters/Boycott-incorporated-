-- Drop the existing check_daily_activity_limit function first
DROP FUNCTION IF EXISTS public.check_daily_activity_limit(UUID, TEXT, INTEGER);

-- Fix secure_complete_task to call increment_daily_activity for proper daily progress tracking
CREATE OR REPLACE FUNCTION public.secure_complete_task(
  p_user_id UUID,
  p_task_id UUID,
  p_verification_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_existing RECORD;
  v_points_to_award INTEGER;
  v_user_vip_tier TEXT;
  v_activity_type TEXT;
  v_activity RECORD;
  v_today DATE := CURRENT_DATE;
  v_is_weekend BOOLEAN;
  v_has_campaign BOOLEAN;
  v_day_of_week INTEGER;
  v_max_for_type INTEGER;
  v_current_count INTEGER;
  v_max_points INTEGER := 180;
  v_current_points INTEGER;
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
  
  -- Check weekend status
  v_day_of_week := EXTRACT(DOW FROM v_today);
  v_is_weekend := v_day_of_week IN (0, 6);
  
  SELECT EXISTS (
    SELECT 1 FROM weekend_campaigns 
    WHERE is_active = true 
    AND v_today BETWEEN start_date AND end_date
  ) INTO v_has_campaign;
  
  IF v_is_weekend AND NOT v_has_campaign THEN
    RETURN jsonb_build_object('success', false, 'message', 'Activities are paused on weekends. Come back Monday!');
  END IF;
  
  -- Determine activity type based on task category
  v_activity_type := CASE 
    WHEN v_task.category IN ('partnership', 'ai', 'partnered') THEN 'partnered_task'
    WHEN v_task.category = 'survey' THEN 'survey'
    ELSE 'regular_task'
  END;
  
  -- Ensure daily activity record exists
  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  
  -- Get current activity
  SELECT * INTO v_activity 
  FROM daily_activity_limits 
  WHERE user_id = p_user_id AND activity_date = v_today;
  
  v_current_points := COALESCE(v_activity.total_points_earned, 0);
  
  -- Check global daily cap
  IF v_current_points + v_task.points_reward > v_max_points THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily earning limit reached (180 pts). Come back tomorrow!');
  END IF;
  
  -- Get type-specific limits and check
  CASE v_activity_type
    WHEN 'partnered_task' THEN
      v_max_for_type := 1;
      v_current_count := COALESCE(v_activity.ai_tasks_completed, 0);
    WHEN 'survey' THEN
      v_max_for_type := CASE WHEN v_has_campaign THEN 4 ELSE 3 END;
      v_current_count := COALESCE(v_activity.surveys_completed, 0);
    ELSE -- regular_task
      v_max_for_type := 2;
      v_current_count := COALESCE(v_activity.regular_tasks_completed, 0);
  END CASE;
  
  IF v_current_count >= v_max_for_type THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily limit reached for this activity type');
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
      NULL; -- instant, survey, ai_survey, quiz - no additional validation needed
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
  
  -- INCREMENT DAILY ACTIVITY TRACKING - THIS IS THE KEY FIX!
  PERFORM increment_daily_activity(p_user_id, v_activity_type, v_points_to_award);
  
  -- Log transaction
  INSERT INTO transactions (user_id, points_amount, type, description, reference_id, status)
  VALUES (p_user_id, v_points_to_award, 'task_completion', 'Completed task: ' || v_task.title, p_task_id, 'completed');
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Task completed!', 
    'points', v_points_to_award,
    'task_title', v_task.title
  );
END;
$$;