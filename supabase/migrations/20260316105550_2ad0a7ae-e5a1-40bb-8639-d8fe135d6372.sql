-- Drop old award_survey_points with json return type so we can recreate with consistent types
DROP FUNCTION IF EXISTS public.award_survey_points(uuid, integer, text);

-- Recreate simple version returning json
CREATE OR REPLACE FUNCTION public.award_survey_points(
  p_user_id uuid,
  p_points integer,
  p_survey_title text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_surveys_today INTEGER;
  v_max_surveys INTEGER := 3;
BEGIN
  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  SELECT COALESCE(surveys_completed, 0) INTO v_surveys_today
  FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  IF v_surveys_today >= v_max_surveys THEN
    RETURN json_build_object('success', false, 'message', 'Daily survey limit reached! You can complete up to 3 surveys per day.', 'points_awarded', 0);
  END IF;

  UPDATE wallets SET available_points = available_points + p_points WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + p_points WHERE id = p_user_id;
  
  UPDATE daily_activity_limits
  SET surveys_completed = COALESCE(surveys_completed, 0) + 1,
      total_points_earned = COALESCE(total_points_earned, 0) + p_points, updated_at = NOW()
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  INSERT INTO transactions (user_id, points_amount, type, description, status)
  VALUES (p_user_id, p_points, 'survey_completion', 'Completed survey: ' || p_survey_title, 'completed');
  
  RETURN json_build_object('success', true, 'points_awarded', p_points, 'message', 'Points awarded successfully');
END;
$$;
