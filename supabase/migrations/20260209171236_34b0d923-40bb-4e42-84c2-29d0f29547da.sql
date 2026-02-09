
-- Add page_placement column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS page_placement text DEFAULT 'earn';

-- Update get_daily_activity_status to support 200/400 dynamic cap
CREATE OR REPLACE FUNCTION public.get_daily_activity_status(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_daily_limits daily_activity_limits%ROWTYPE;
  v_is_weekend boolean;
  v_has_campaign boolean;
  v_campaign_name text;
  v_max_daily_points integer;
  v_max_partnered integer := 1;
  v_max_regular integer := 2;
  v_max_surveys integer := 3;
  v_max_videos integer := 5;
  v_max_games integer := 3;
  v_remaining_points integer;
BEGIN
  -- Check if it's a weekend
  v_is_weekend := EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6);
  
  -- Check for active weekend campaign
  SELECT true, name INTO v_has_campaign, v_campaign_name
  FROM weekend_campaigns
  WHERE is_active = true
    AND CURRENT_DATE BETWEEN start_date AND end_date
  LIMIT 1;
  
  v_has_campaign := COALESCE(v_has_campaign, false);
  
  -- Dynamic daily cap: 400 with campaign, 200 without
  IF v_has_campaign THEN
    v_max_daily_points := 400;
  ELSE
    v_max_daily_points := 200;
  END IF;
  
  -- Get or create daily activity record
  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  
  SELECT * INTO v_daily_limits
  FROM daily_activity_limits
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  v_remaining_points := GREATEST(0, v_max_daily_points - COALESCE(v_daily_limits.total_points_earned, 0));
  
  v_result := json_build_object(
    'partnered_tasks', json_build_object(
      'completed', COALESCE(v_daily_limits.ai_tasks_completed, 0),
      'max', v_max_partnered,
      'remaining', GREATEST(0, v_max_partnered - COALESCE(v_daily_limits.ai_tasks_completed, 0))
    ),
    'regular_tasks', json_build_object(
      'completed', COALESCE(v_daily_limits.regular_tasks_completed, 0),
      'max', v_max_regular,
      'remaining', GREATEST(0, v_max_regular - COALESCE(v_daily_limits.regular_tasks_completed, 0))
    ),
    'surveys', json_build_object(
      'completed', COALESCE(v_daily_limits.surveys_completed, 0),
      'max', v_max_surveys,
      'remaining', GREATEST(0, v_max_surveys - COALESCE(v_daily_limits.surveys_completed, 0))
    ),
    'videos', json_build_object(
      'completed', COALESCE(v_daily_limits.videos_watched, 0),
      'max', v_max_videos,
      'remaining', GREATEST(0, v_max_videos - COALESCE(v_daily_limits.videos_watched, 0))
    ),
    'games', json_build_object(
      'completed', COALESCE(v_daily_limits.games_played, 0),
      'max', v_max_games,
      'remaining', GREATEST(0, v_max_games - COALESCE(v_daily_limits.games_played, 0))
    ),
    'total_points', json_build_object(
      'earned', COALESCE(v_daily_limits.total_points_earned, 0),
      'max', v_max_daily_points,
      'remaining', v_remaining_points
    ),
    'is_weekend', v_is_weekend,
    'has_campaign', v_has_campaign
  );
  
  RETURN v_result;
END;
$$;
