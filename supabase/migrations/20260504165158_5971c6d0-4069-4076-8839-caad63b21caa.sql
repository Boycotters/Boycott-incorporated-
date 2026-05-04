
-- Fix: complete_video_watch was inserting transaction type 'video_watch' which violates the type check constraint.
CREATE OR REPLACE FUNCTION public.complete_video_watch(p_user_id uuid, p_video_id uuid, p_watch_duration integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_video videos%ROWTYPE;
  v_existing user_video_views%ROWTYPE;
  v_daily_limits daily_activity_limits%ROWTYPE;
  v_max_videos integer := 5;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT * INTO v_video FROM videos WHERE id = p_video_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Video not found'); END IF;

  SELECT * INTO v_existing FROM user_video_views
  WHERE user_id = p_user_id AND video_id = p_video_id AND watched_date = v_today AND completed = true;
  IF FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Already watched today', 'already_completed', true); END IF;

  SELECT * INTO v_daily_limits FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = v_today;
  IF v_daily_limits.videos_watched >= v_max_videos THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily video limit reached (5/5)');
  END IF;

  INSERT INTO user_video_views (user_id, video_id, watch_duration_seconds, completed, points_awarded, watched_date)
  VALUES (p_user_id, p_video_id, p_watch_duration, true, v_video.points_reward, v_today)
  ON CONFLICT (user_id, video_id, watched_date)
  DO UPDATE SET watch_duration_seconds = EXCLUDED.watch_duration_seconds, completed = true, points_awarded = v_video.points_reward;

  UPDATE wallets SET available_points = available_points + v_video.points_reward WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + v_video.points_reward WHERE id = p_user_id;

  -- Use 'video_reward' which is allowed by transactions_type_check
  INSERT INTO transactions (user_id, type, points_amount, description, reference_id, status)
  VALUES (p_user_id, 'video_reward', v_video.points_reward, 'Watched video: ' || v_video.title, p_video_id, 'completed');

  UPDATE videos SET view_count = view_count + 1 WHERE id = p_video_id;

  INSERT INTO daily_activity_limits (user_id, activity_date, videos_watched, total_points_earned)
  VALUES (p_user_id, v_today, 1, v_video.points_reward)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET videos_watched = daily_activity_limits.videos_watched + 1,
    total_points_earned = daily_activity_limits.total_points_earned + v_video.points_reward, updated_at = now();

  RETURN jsonb_build_object('success', true, 'points', v_video.points_reward, 'video_title', v_video.title, 'message', 'Video completed!');
END;
$$;

-- Helper: simple daily limit check used by Discover page tasks
CREATE OR REPLACE FUNCTION public.check_daily_limit(p_user_id uuid, p_activity_type text DEFAULT 'task')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limits jsonb;
  v_remaining integer;
  v_allowed boolean;
BEGIN
  v_limits := check_comprehensive_daily_limits(p_user_id);
  v_remaining := COALESCE((v_limits->'total_points'->>'remaining')::int, 0);
  v_allowed := v_remaining > 0;
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining_points', v_remaining,
    'activity_type', p_activity_type,
    'limits', v_limits
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_daily_limit(uuid, text) TO authenticated;
