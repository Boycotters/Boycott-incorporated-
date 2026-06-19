
DROP FUNCTION IF EXISTS public.award_survey_points(uuid, integer, text, text, jsonb, jsonb, integer);
DROP FUNCTION IF EXISTS public.award_survey_points(uuid, integer, text, text, json, json, integer);
DROP FUNCTION IF EXISTS public.award_survey_points(uuid, integer, text);

CREATE FUNCTION public.award_survey_points(
  p_user_id uuid,
  p_points integer,
  p_survey_title text,
  p_survey_id text DEFAULT NULL,
  p_questions jsonb DEFAULT '[]'::jsonb,
  p_responses jsonb DEFAULT '[]'::jsonb,
  p_completion_time integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_surveys_today integer;
  v_max_surveys integer := 3;
  v_max_points integer := 100;
  v_user_email text;
  v_user_name text;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized', 'points_awarded', 0);
  END IF;
  p_points := GREATEST(0, LEAST(COALESCE(p_points, 0), v_max_points));

  INSERT INTO daily_activity_limits (user_id, activity_date) VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  SELECT COALESCE(surveys_completed, 0) INTO v_surveys_today
  FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;

  IF v_surveys_today >= v_max_surveys THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily survey limit reached (3/3)', 'points_awarded', 0);
  END IF;

  SELECT email, full_name INTO v_user_email, v_user_name FROM users WHERE id = p_user_id;

  UPDATE wallets SET available_points = available_points + p_points WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + p_points WHERE id = p_user_id;

  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'survey_completion', p_points, 'Completed survey: ' || p_survey_title, 'completed');

  INSERT INTO survey_responses (user_id, survey_id, survey_title, questions, responses, points_awarded, completion_time_seconds, user_email, user_name)
  VALUES (p_user_id, COALESCE(p_survey_id, 'survey_' || gen_random_uuid()::text), p_survey_title, p_questions, p_responses, p_points, p_completion_time, v_user_email, v_user_name);

  UPDATE daily_activity_limits
    SET surveys_completed = COALESCE(surveys_completed, 0) + 1,
        total_points_earned = COALESCE(total_points_earned, 0) + p_points,
        updated_at = now()
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;

  RETURN jsonb_build_object('success', true, 'points_awarded', p_points, 'message', 'Survey completed successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_survey_points(uuid, integer, text, text, jsonb, jsonb, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.play_game(p_user_id uuid, p_game_type text, p_points_earned integer, p_score integer DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_plays_per_game INTEGER := 1; v_plays_today_this_game INTEGER; v_total_games_today INTEGER;
  v_user_tier VARCHAR; v_tier_multiplier NUMERIC := 1.0; v_final_points INTEGER; v_max_points INTEGER;
  v_max_daily_games INTEGER := 3;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  IF p_game_type NOT IN ('spin_wheel', 'memory_match', 'basketball', 'keepy_uppy') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid game type');
  END IF;
  SELECT u.vip_tier INTO v_user_tier FROM users u WHERE id = p_user_id;
  SELECT COALESCE(game_plays_per_attempt, 1), COALESCE(multiplier, 1.0) INTO v_plays_per_game, v_tier_multiplier
  FROM vip_tiers WHERE slug = COALESCE(v_user_tier, 'bronze');
  SELECT COUNT(*) INTO v_plays_today_this_game FROM user_game_plays
  WHERE user_id = p_user_id AND game_type = p_game_type AND played_at >= CURRENT_DATE;
  IF v_plays_today_this_game >= v_plays_per_game THEN
    RETURN json_build_object('success', false, 'message', format('Daily limit reached for %s!', p_game_type), 'plays_remaining', 0);
  END IF;
  INSERT INTO daily_activity_limits (user_id, activity_date) VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  SELECT COALESCE(games_played, 0) INTO v_total_games_today FROM daily_activity_limits
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  IF v_total_games_today >= v_max_daily_games THEN
    RETURN json_build_object('success', false, 'message', 'Daily game limit reached!', 'plays_remaining', 0);
  END IF;
  CASE p_game_type WHEN 'spin_wheel' THEN v_max_points := 100; WHEN 'memory_match' THEN v_max_points := 95;
    WHEN 'basketball' THEN v_max_points := 80; WHEN 'keepy_uppy' THEN v_max_points := 100; ELSE v_max_points := 50; END CASE;
  v_final_points := ROUND(GREATEST(LEAST(p_points_earned, v_max_points), 0) * v_tier_multiplier);
  INSERT INTO user_game_plays (user_id, game_type, score, points_earned, played_at) VALUES (p_user_id, p_game_type, p_score, v_final_points, now());
  UPDATE wallets SET available_points = available_points + v_final_points WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + v_final_points WHERE id = p_user_id;
  INSERT INTO transactions (user_id, type, points_amount, description, status) VALUES (p_user_id, 'game', v_final_points, format('%s game reward', p_game_type), 'completed');
  UPDATE daily_activity_limits SET games_played = COALESCE(games_played, 0) + 1,
    total_points_earned = COALESCE(total_points_earned, 0) + v_final_points, updated_at = now()
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  RETURN json_build_object('success', true, 'message', format('You earned %s points!', v_final_points),
    'points_earned', v_final_points, 'plays_remaining', v_max_daily_games - v_total_games_today - 1, 'multiplier_applied', v_tier_multiplier);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_video_watch(p_user_id uuid, p_video_id uuid, p_watch_duration integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_video RECORD; v_existing_view RECORD; v_points_to_award INTEGER; v_videos_today INTEGER; v_max_videos INTEGER := 5;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  SELECT * INTO v_video FROM videos WHERE id = p_video_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Video not found'); END IF;
  SELECT * INTO v_existing_view FROM user_video_views WHERE user_id = p_user_id AND video_id = p_video_id;
  IF FOUND AND v_existing_view.completed THEN RETURN jsonb_build_object('success', false, 'message', 'Already watched this video', 'already_completed', true); END IF;
  INSERT INTO daily_activity_limits (user_id, activity_date) VALUES (p_user_id, CURRENT_DATE) ON CONFLICT (user_id, activity_date) DO NOTHING;
  SELECT COALESCE(videos_watched, 0) INTO v_videos_today FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  IF v_videos_today >= v_max_videos THEN RETURN jsonb_build_object('success', false, 'message', 'Daily ad limit reached!'); END IF;
  IF p_watch_duration >= (v_video.duration_seconds * 0.8) THEN v_points_to_award := LEAST(v_video.points_reward, 50);
  ELSE RETURN jsonb_build_object('success', false, 'message', 'Please watch the full video to earn points'); END IF;
  INSERT INTO user_video_views (user_id, video_id, watch_duration_seconds, completed, points_awarded) VALUES (p_user_id, p_video_id, p_watch_duration, true, v_points_to_award)
  ON CONFLICT (user_id, video_id) DO UPDATE SET watch_duration_seconds = EXCLUDED.watch_duration_seconds, completed = true, points_awarded = v_points_to_award, watched_at = now();
  UPDATE videos SET view_count = view_count + 1 WHERE id = p_video_id;
  UPDATE wallets SET available_points = available_points + v_points_to_award WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + v_points_to_award WHERE id = p_user_id;
  INSERT INTO transactions (user_id, points_amount, type, description, reference_id, status) VALUES (p_user_id, v_points_to_award, 'video_reward', 'Watched video: ' || v_video.title, p_video_id, 'completed');
  UPDATE daily_activity_limits SET videos_watched = COALESCE(videos_watched, 0) + 1,
    total_points_earned = COALESCE(total_points_earned, 0) + v_points_to_award, updated_at = now()
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  RETURN jsonb_build_object('success', true, 'message', 'Points awarded!', 'points', v_points_to_award, 'video_title', v_video.title);
END; $$;

DROP POLICY IF EXISTS "Users can view task proofs" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete entertainment videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage entertainment videos upload" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage entertainment videos delete" ON storage.objects;
CREATE POLICY "Admins manage entertainment videos upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entertainment-videos' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins manage entertainment videos delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'entertainment-videos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view earning algorithms" ON public.earning_algorithms;
DROP POLICY IF EXISTS "Admins can view earning algorithms" ON public.earning_algorithms;
CREATE POLICY "Admins can view earning algorithms"
  ON public.earning_algorithms FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view tournament participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Authenticated can view tournament participants" ON public.tournament_participants;
CREATE POLICY "Authenticated can view tournament participants"
  ON public.tournament_participants FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view their own OTP codes" ON public.phone_verification_otps;
DROP POLICY IF EXISTS "Users can view own OTPs" ON public.phone_verification_otps;
DROP POLICY IF EXISTS "Users view own OTPs" ON public.phone_verification_otps;
REVOKE SELECT ON public.phone_verification_otps FROM authenticated, anon;

REVOKE SELECT (tpin, pacra_number) ON public.business_profiles FROM authenticated, anon;
GRANT SELECT (tpin, pacra_number) ON public.business_profiles TO service_role;

REVOKE SELECT (email, phone) ON public.business_team_members FROM authenticated, anon;
GRANT SELECT (email, phone) ON public.business_team_members TO service_role;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'messages' AND relnamespace = 'realtime'::regnamespace) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_user_topic_only" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_user_topic_write" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "authenticated_user_topic_only" ON realtime.messages
      FOR SELECT TO authenticated
      USING (
        realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
        OR realtime.topic() LIKE 'public:%'
      )$p$;
    EXECUTE $p$CREATE POLICY "authenticated_user_topic_write" ON realtime.messages
      FOR INSERT TO authenticated
      WITH CHECK (
        realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
      )$p$;
  END IF;
END $outer$;
