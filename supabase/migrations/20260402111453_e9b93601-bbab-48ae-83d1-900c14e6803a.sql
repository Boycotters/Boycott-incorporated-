
-- Force drop ALL award_survey_points overloads by exact arg types
DROP FUNCTION IF EXISTS public.award_survey_points(uuid, integer, text, text, json, json, integer);
DROP FUNCTION IF EXISTS public.award_survey_points(uuid, integer, text, text, jsonb, jsonb, integer);

-- Recreate single version
CREATE FUNCTION public.award_survey_points(
  p_user_id uuid,
  p_points integer,
  p_survey_title text,
  p_survey_id text DEFAULT NULL,
  p_questions jsonb DEFAULT '[]'::jsonb,
  p_responses jsonb DEFAULT '[]'::jsonb,
  p_completion_time integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limits daily_activity_limits%ROWTYPE;
  v_max_surveys integer := 3;
  v_user_email text;
  v_user_name text;
BEGIN
  SELECT * INTO v_daily_limits FROM daily_activity_limits
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;

  IF v_daily_limits.surveys_completed >= v_max_surveys THEN
    RETURN json_build_object('success', false, 'message', 'Daily survey limit reached (3/3)', 'points_awarded', 0);
  END IF;

  SELECT email, full_name INTO v_user_email, v_user_name FROM users WHERE id = p_user_id;

  UPDATE wallets SET available_points = available_points + p_points WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + p_points WHERE id = p_user_id;

  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'survey_completion', p_points, 'Completed survey: ' || p_survey_title, 'completed');

  INSERT INTO survey_responses (user_id, survey_id, survey_title, questions, responses, points_awarded, completion_time_seconds, user_email, user_name)
  VALUES (p_user_id, COALESCE(p_survey_id, 'survey_' || gen_random_uuid()::text), p_survey_title, p_questions, p_responses, p_points, p_completion_time, v_user_email, v_user_name);

  INSERT INTO daily_activity_limits (user_id, activity_date, surveys_completed, total_points_earned)
  VALUES (p_user_id, CURRENT_DATE, 1, p_points)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    surveys_completed = daily_activity_limits.surveys_completed + 1,
    total_points_earned = daily_activity_limits.total_points_earned + p_points,
    updated_at = now();

  RETURN json_build_object('success', true, 'points_awarded', p_points, 'message', 'Survey completed successfully');
END;
$$;
