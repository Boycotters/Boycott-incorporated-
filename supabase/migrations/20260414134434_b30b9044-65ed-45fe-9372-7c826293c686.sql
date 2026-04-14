
-- Step 1: Add watched_date column
ALTER TABLE public.user_video_views ADD COLUMN watched_date date DEFAULT CURRENT_DATE;
UPDATE public.user_video_views SET watched_date = (watched_at::date);

-- Step 2: Drop BOTH old unique constraints  
ALTER TABLE public.user_video_views DROP CONSTRAINT user_video_views_user_id_video_id_key;
ALTER TABLE public.user_video_views DROP CONSTRAINT user_video_views_user_video_unique;

-- Step 3: Add date-aware unique constraint
ALTER TABLE public.user_video_views ADD CONSTRAINT user_video_views_user_video_date_unique UNIQUE (user_id, video_id, watched_date);

-- Step 4: Recreate complete_video_watch
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
  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'video_watch', v_video.points_reward, 'Watched video: ' || v_video.title, 'completed');
  UPDATE videos SET view_count = view_count + 1 WHERE id = p_video_id;

  INSERT INTO daily_activity_limits (user_id, activity_date, videos_watched, total_points_earned)
  VALUES (p_user_id, v_today, 1, v_video.points_reward)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET videos_watched = daily_activity_limits.videos_watched + 1,
    total_points_earned = daily_activity_limits.total_points_earned + v_video.points_reward, updated_at = now();

  RETURN jsonb_build_object('success', true, 'points', v_video.points_reward, 'video_title', v_video.title, 'message', 'Video completed!');
END;
$$;

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, body text NOT NULL,
  target_audience text NOT NULL DEFAULT 'all',
  channel text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  sent_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Create ai_generated_videos table
CREATE TABLE public.ai_generated_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, prompt text NOT NULL,
  video_url text, thumbnail_url text,
  status text NOT NULL DEFAULT 'pending',
  target_placement text NOT NULL DEFAULT 'videos',
  duration_seconds integer DEFAULT 30,
  points_reward integer DEFAULT 5,
  is_active boolean DEFAULT false,
  created_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.ai_generated_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage AI videos" ON public.ai_generated_videos
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can view active AI videos" ON public.ai_generated_videos
  FOR SELECT TO authenticated USING (is_active = true);
