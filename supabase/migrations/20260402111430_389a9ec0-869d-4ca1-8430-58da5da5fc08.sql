
-- Drop and recreate complete_video_watch with proper daily tracking
DROP FUNCTION IF EXISTS public.complete_video_watch(uuid, uuid, integer);

CREATE FUNCTION public.complete_video_watch(
  p_user_id uuid,
  p_video_id uuid,
  p_watch_duration integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_video videos%ROWTYPE;
  v_existing user_video_views%ROWTYPE;
  v_daily_limits daily_activity_limits%ROWTYPE;
  v_max_videos integer := 5;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT * INTO v_video FROM videos WHERE id = p_video_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Video not found');
  END IF;

  -- Check if already watched today
  SELECT * INTO v_existing FROM user_video_views
  WHERE user_id = p_user_id AND video_id = p_video_id AND completed = true
    AND watched_at::date = v_today;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already watched today', 'already_completed', true);
  END IF;

  -- Check daily video limit
  SELECT * INTO v_daily_limits FROM daily_activity_limits
  WHERE user_id = p_user_id AND activity_date = v_today;
  
  IF v_daily_limits.videos_watched >= v_max_videos THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily video limit reached (5/5)');
  END IF;

  -- Record the view
  INSERT INTO user_video_views (user_id, video_id, watch_duration_seconds, completed, points_awarded)
  VALUES (p_user_id, p_video_id, p_watch_duration, true, v_video.points_reward);

  -- Award points
  UPDATE wallets SET available_points = available_points + v_video.points_reward WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + v_video.points_reward WHERE id = p_user_id;

  -- Create transaction
  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'video_watch', v_video.points_reward, 'Watched video: ' || v_video.title, 'completed');

  -- Increment view count
  UPDATE videos SET view_count = view_count + 1 WHERE id = p_video_id;

  -- Increment daily activity
  INSERT INTO daily_activity_limits (user_id, activity_date, videos_watched, total_points_earned)
  VALUES (p_user_id, v_today, 1, v_video.points_reward)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    videos_watched = daily_activity_limits.videos_watched + 1,
    total_points_earned = daily_activity_limits.total_points_earned + v_video.points_reward,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'points', v_video.points_reward,
    'video_title', v_video.title,
    'message', 'Video completed!'
  );
END;
$$;

-- Fix get_daily_activity_status to return accurate data
DROP FUNCTION IF EXISTS public.get_daily_activity_status(uuid);

CREATE FUNCTION public.get_daily_activity_status(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits daily_activity_limits%ROWTYPE;
  v_is_weekend boolean;
  v_has_campaign boolean;
  v_max_points integer;
BEGIN
  v_is_weekend := EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6);
  
  SELECT EXISTS(
    SELECT 1 FROM weekend_campaigns
    WHERE is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
  ) INTO v_has_campaign;

  IF v_has_campaign THEN v_max_points := 400;
  ELSE v_max_points := 200;
  END IF;

  SELECT * INTO v_limits FROM daily_activity_limits
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;

  IF NOT FOUND THEN
    INSERT INTO daily_activity_limits (user_id, activity_date)
    VALUES (p_user_id, CURRENT_DATE)
    RETURNING * INTO v_limits;
  END IF;

  RETURN json_build_object(
    'partnered_tasks', json_build_object('completed', COALESCE(v_limits.ai_tasks_completed,0), 'max', 1, 'remaining', GREATEST(0, 1 - COALESCE(v_limits.ai_tasks_completed,0))),
    'regular_tasks', json_build_object('completed', COALESCE(v_limits.regular_tasks_completed,0), 'max', 2, 'remaining', GREATEST(0, 2 - COALESCE(v_limits.regular_tasks_completed,0))),
    'surveys', json_build_object('completed', COALESCE(v_limits.surveys_completed,0), 'max', 3, 'remaining', GREATEST(0, 3 - COALESCE(v_limits.surveys_completed,0))),
    'videos', json_build_object('completed', COALESCE(v_limits.videos_watched,0), 'max', 5, 'remaining', GREATEST(0, 5 - COALESCE(v_limits.videos_watched,0))),
    'games', json_build_object('completed', COALESCE(v_limits.games_played,0), 'max', 3, 'remaining', GREATEST(0, 3 - COALESCE(v_limits.games_played,0))),
    'total_points', json_build_object('earned', COALESCE(v_limits.total_points_earned,0), 'max', v_max_points, 'remaining', GREATEST(0, v_max_points - COALESCE(v_limits.total_points_earned,0))),
    'is_weekend', v_is_weekend,
    'has_campaign', v_has_campaign
  );
END;
$$;
