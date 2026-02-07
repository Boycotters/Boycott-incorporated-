-- Add quiz_data column to tasks table for storing quiz questions
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS quiz_data JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.tasks.quiz_data IS 'JSON array of quiz questions with format: [{question: string, options: string[], correct_answer: number}]';

-- Update the earning algorithm configs to use 400 daily cap
UPDATE public.earning_algorithms 
SET config = jsonb_set(config, '{max_daily_points}', '400')
WHERE name = 'daily_earning_limits';

-- Update daily limits config
UPDATE public.earning_algorithms 
SET config = jsonb_set(config, '{max_total_points}', '400')
WHERE name = 'daily_limits';

-- Insert or update algorithm if not exists
INSERT INTO public.earning_algorithms (name, description, config, is_active)
VALUES (
  'daily_earning_limits',
  'Controls maximum daily points and activity limits',
  '{"max_daily_points": 400, "partnered_tasks_limit": 2, "regular_tasks_limit": 4, "surveys_limit": 3, "videos_limit": 6, "games_limit": 4, "campaign_percentage": 50}'::jsonb,
  true
)
ON CONFLICT (name) DO UPDATE SET config = EXCLUDED.config;

-- Create or replace the get_daily_activity_status function with 400 point cap
CREATE OR REPLACE FUNCTION public.get_daily_activity_status(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_today date := CURRENT_DATE;
  v_day_of_week int := EXTRACT(DOW FROM v_today);
  v_is_weekend boolean := v_day_of_week IN (0, 6);
  v_has_campaign boolean := false;
  v_daily_limits record;
  v_partnered_completed int := 0;
  v_regular_completed int := 0;
  v_surveys_completed int := 0;
  v_videos_completed int := 0;
  v_games_completed int := 0;
  v_total_points int := 0;
  v_max_daily_points int := 400;
  v_partnered_limit int := 2;
  v_regular_limit int := 4;
  v_surveys_limit int := 3;
  v_videos_limit int := 6;
  v_games_limit int := 4;
BEGIN
  -- Check for active weekend campaign
  SELECT EXISTS(
    SELECT 1 FROM public.weekend_campaigns
    WHERE is_active = true
    AND v_today BETWEEN start_date AND end_date
  ) INTO v_has_campaign;

  -- Get daily activity record
  SELECT 
    COALESCE(ai_tasks_completed, 0),
    COALESCE(regular_tasks_completed, 0),
    COALESCE(surveys_completed, 0),
    COALESCE(videos_watched, 0),
    COALESCE(games_played, 0),
    COALESCE(total_points_earned, 0)
  INTO 
    v_partnered_completed,
    v_regular_completed,
    v_surveys_completed,
    v_videos_completed,
    v_games_completed,
    v_total_points
  FROM public.daily_activity_limits
  WHERE user_id = p_user_id AND activity_date = v_today;

  -- Build result
  v_result := json_build_object(
    'partnered_tasks', json_build_object(
      'completed', v_partnered_completed,
      'max', v_partnered_limit,
      'remaining', GREATEST(0, v_partnered_limit - v_partnered_completed)
    ),
    'regular_tasks', json_build_object(
      'completed', v_regular_completed,
      'max', v_regular_limit,
      'remaining', GREATEST(0, v_regular_limit - v_regular_completed)
    ),
    'surveys', json_build_object(
      'completed', v_surveys_completed,
      'max', v_surveys_limit,
      'remaining', GREATEST(0, v_surveys_limit - v_surveys_completed)
    ),
    'videos', json_build_object(
      'completed', v_videos_completed,
      'max', v_videos_limit,
      'remaining', GREATEST(0, v_videos_limit - v_videos_completed)
    ),
    'games', json_build_object(
      'completed', v_games_completed,
      'max', v_games_limit,
      'remaining', GREATEST(0, v_games_limit - v_games_completed)
    ),
    'total_points', json_build_object(
      'earned', v_total_points,
      'max', v_max_daily_points,
      'remaining', GREATEST(0, v_max_daily_points - v_total_points)
    ),
    'is_weekend', v_is_weekend,
    'has_campaign', v_has_campaign
  );

  RETURN v_result;
END;
$$;