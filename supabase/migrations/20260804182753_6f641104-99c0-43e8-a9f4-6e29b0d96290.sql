-- Helper: current daily cap
CREATE OR REPLACE FUNCTION public.current_daily_cap()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM weekend_campaigns
    WHERE is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date
  ) THEN 400 ELSE 200 END;
$$;
GRANT EXECUTE ON FUNCTION public.current_daily_cap() TO authenticated, anon, service_role;

-- SURVEYS: 15 pts, cap enforced
CREATE OR REPLACE FUNCTION public.award_survey_points(p_user_id uuid, p_points integer, p_survey_title text, p_survey_id text DEFAULT NULL::text, p_questions jsonb DEFAULT '[]'::jsonb, p_responses jsonb DEFAULT '[]'::jsonb, p_completion_time integer DEFAULT NULL::integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_surveys_today integer;
  v_points_today integer;
  v_cap integer := current_daily_cap();
  v_max_surveys integer := 3;
  v_max_points integer := 15;
  v_user_email text;
  v_user_name text;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized', 'points_awarded', 0);
  END IF;
  p_points := v_max_points;

  INSERT INTO daily_activity_limits (user_id, activity_date) VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  SELECT COALESCE(surveys_completed, 0), COALESCE(total_points_earned, 0)
    INTO v_surveys_today, v_points_today
  FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;

  IF v_surveys_today >= v_max_surveys THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily survey limit reached (3/3)', 'points_awarded', 0);
  END IF;

  IF v_points_today + p_points > v_cap THEN
    RETURN jsonb_build_object('success', false, 'message', format('Daily earning cap reached (%s pts). Come back tomorrow!', v_cap), 'points_awarded', 0);
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
$function$;

-- VIDEOS: 5 pts, cap enforced
CREATE OR REPLACE FUNCTION public.complete_video_watch(p_user_id uuid, p_video_id uuid, p_watch_duration integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_video RECORD;
  v_existing RECORD;
  v_points INTEGER;
  v_today INTEGER;
  v_points_today INTEGER;
  v_cap INTEGER := current_daily_cap();
  v_max INTEGER := 5;
  v_required NUMERIC;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  SELECT * INTO v_video FROM videos WHERE id = p_video_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Video not found');
  END IF;

  SELECT * INTO v_existing
  FROM user_video_views
  WHERE user_id = p_user_id AND video_id = p_video_id AND watched_date = CURRENT_DATE;
  IF FOUND AND v_existing.completed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already watched today', 'already_completed', true);
  END IF;

  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  SELECT COALESCE(videos_watched, 0), COALESCE(total_points_earned, 0)
    INTO v_today, v_points_today
  FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;

  IF v_today >= v_max THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily video limit reached');
  END IF;

  v_required := GREATEST(COALESCE(v_video.duration_seconds, 0), 1) * 0.8;
  IF p_watch_duration < v_required THEN
    RETURN jsonb_build_object('success', false, 'message', format('Watch at least %s seconds to earn points', CEIL(v_required)::int), 'required_seconds', CEIL(v_required)::int);
  END IF;

  v_points := LEAST(COALESCE(v_video.points_reward, 5), 5);

  IF v_points_today + v_points > v_cap THEN
    RETURN jsonb_build_object('success', false, 'message', format('Daily earning cap reached (%s pts). Come back tomorrow!', v_cap));
  END IF;

  INSERT INTO user_video_views (user_id, video_id, watch_duration_seconds, completed, points_awarded, watched_date)
  VALUES (p_user_id, p_video_id, p_watch_duration, true, v_points, CURRENT_DATE)
  ON CONFLICT (user_id, video_id, watched_date)
  DO UPDATE SET watch_duration_seconds = EXCLUDED.watch_duration_seconds, completed = true, points_awarded = v_points, watched_at = now();

  UPDATE videos SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_video_id;
  UPDATE wallets SET available_points = available_points + v_points WHERE user_id = p_user_id;
  UPDATE users SET total_points = COALESCE(total_points, 0) + v_points WHERE id = p_user_id;

  INSERT INTO transactions (user_id, points_amount, type, description, reference_id, status)
  VALUES (p_user_id, v_points, 'video_reward', 'Watched video: ' || v_video.title, p_video_id, 'completed');

  UPDATE daily_activity_limits
  SET videos_watched = COALESCE(videos_watched, 0) + 1,
      total_points_earned = COALESCE(total_points_earned, 0) + v_points,
      updated_at = now()
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;

  RETURN jsonb_build_object('success', true, 'message', 'Points awarded!', 'points', v_points, 'video_title', v_video.title);
END;
$function$;

-- GAMES: max 10 pts per play, cap enforced, no tier inflation past 10
CREATE OR REPLACE FUNCTION public.play_game(p_user_id uuid, p_game_type text, p_points_earned integer, p_score integer DEFAULT NULL::integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_plays_per_game INTEGER := 1; v_plays_today_this_game INTEGER; v_total_games_today INTEGER;
  v_points_today INTEGER; v_cap INTEGER := current_daily_cap();
  v_final_points INTEGER; v_max_points INTEGER := 10;
  v_max_daily_games INTEGER := 3;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  IF p_game_type NOT IN ('spin_wheel', 'memory_match', 'basketball', 'keepy_uppy') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid game type');
  END IF;
  SELECT COALESCE(game_plays_per_attempt, 1) INTO v_plays_per_game
  FROM vip_tiers WHERE slug = COALESCE((SELECT vip_tier FROM users WHERE id = p_user_id), 'bronze');
  v_plays_per_game := COALESCE(v_plays_per_game, 1);

  SELECT COUNT(*) INTO v_plays_today_this_game FROM user_game_plays
  WHERE user_id = p_user_id AND game_type = p_game_type AND played_at >= CURRENT_DATE;
  IF v_plays_today_this_game >= v_plays_per_game THEN
    RETURN json_build_object('success', false, 'message', format('Daily limit reached for %s!', p_game_type), 'plays_remaining', 0);
  END IF;

  INSERT INTO daily_activity_limits (user_id, activity_date) VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  SELECT COALESCE(games_played, 0), COALESCE(total_points_earned, 0)
    INTO v_total_games_today, v_points_today
  FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  IF v_total_games_today >= v_max_daily_games THEN
    RETURN json_build_object('success', false, 'message', 'Daily game limit reached!', 'plays_remaining', 0);
  END IF;

  v_final_points := GREATEST(LEAST(COALESCE(p_points_earned, 0), v_max_points), 0);
  IF v_points_today + v_final_points > v_cap THEN
    RETURN json_build_object('success', false, 'message', format('Daily earning cap reached (%s pts). Come back tomorrow!', v_cap), 'plays_remaining', 0);
  END IF;

  INSERT INTO user_game_plays (user_id, game_type, score, points_earned, played_at) VALUES (p_user_id, p_game_type, p_score, v_final_points, now());
  UPDATE wallets SET available_points = available_points + v_final_points WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + v_final_points WHERE id = p_user_id;
  INSERT INTO transactions (user_id, type, points_amount, description, status) VALUES (p_user_id, 'game', v_final_points, format('%s game reward', p_game_type), 'completed');
  UPDATE daily_activity_limits SET games_played = COALESCE(games_played, 0) + 1,
    total_points_earned = COALESCE(total_points_earned, 0) + v_final_points, updated_at = now()
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  RETURN json_build_object('success', true, 'message', format('You earned %s points!', v_final_points),
    'points_earned', v_final_points, 'plays_remaining', v_max_daily_games - v_total_games_today - 1);
END; $function$;

-- PARTNER TASKS: hard 75 cap
CREATE OR REPLACE FUNCTION public.complete_ai_partner_task(p_user_id uuid, p_task_type text DEFAULT NULL::text, p_task_title text DEFAULT NULL::text, p_points_amount integer DEFAULT 0, p_source text DEFAULT 'partner'::text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_current_total_points INTEGER;
  v_activity_check JSON;
  v_transaction_id UUID;
  v_is_partner BOOLEAN;
  v_activity_type TEXT;
  v_points_today INTEGER;
  v_cap INTEGER := current_daily_cap();
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  v_is_partner := (p_source IN ('partner', 'ai'));
  v_activity_type := CASE WHEN v_is_partner THEN 'partnered_task' ELSE 'regular_task' END;
  p_points_amount := CASE WHEN v_is_partner THEN 75 ELSE 13 END;

  v_activity_check := check_daily_activity_limit(p_user_id, v_activity_type, p_points_amount);
  IF NOT (v_activity_check->>'allowed')::boolean THEN
    RETURN json_build_object('success', false, 'message', COALESCE(v_activity_check->>'message', 'Daily limit reached. Come back tomorrow!'));
  END IF;

  SELECT COALESCE(total_points_earned, 0) INTO v_points_today
  FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  IF COALESCE(v_points_today, 0) + p_points_amount > v_cap THEN
    RETURN json_build_object('success', false, 'message', format('Daily earning cap reached (%s pts). Come back tomorrow!', v_cap));
  END IF;

  INSERT INTO public.transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'task_completion', p_points_amount, CONCAT('Completed ', p_source, ' task: ', p_task_title), 'completed')
  RETURNING id INTO v_transaction_id;

  UPDATE public.wallets SET available_points = COALESCE(available_points, 0) + p_points_amount WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, available_points) VALUES (p_user_id, p_points_amount);
  END IF;

  UPDATE public.users SET total_points = COALESCE(total_points, 0) + p_points_amount
  WHERE id = p_user_id RETURNING total_points INTO v_current_total_points;

  PERFORM increment_daily_activity(p_user_id, v_activity_type, p_points_amount);

  RETURN json_build_object('success', true, 'message', 'Task completed successfully',
    'points_awarded', p_points_amount, 'new_total_points', v_current_total_points, 'transaction_id', v_transaction_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'An error occurred: ' || SQLERRM);
END;
$function$;

-- TASK COMPLETION: clamp payout by category
CREATE OR REPLACE FUNCTION public.secure_complete_task(p_user_id uuid, p_task_id uuid, p_verification_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_task RECORD;
  v_existing RECORD;
  v_points_to_award INTEGER;
  v_activity_type TEXT;
  v_activity RECORD;
  v_today DATE := CURRENT_DATE;
  v_is_weekend BOOLEAN;
  v_has_campaign BOOLEAN;
  v_max_for_type INTEGER;
  v_current_count INTEGER;
  v_max_points INTEGER;
  v_current_points INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = p_task_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task not found or inactive');
  END IF;

  SELECT * INTO v_existing FROM user_tasks WHERE user_id = p_user_id AND task_id = p_task_id;
  IF FOUND AND v_existing.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task already completed', 'already_completed', true);
  END IF;

  v_is_weekend := EXTRACT(DOW FROM v_today) IN (0, 6);
  SELECT EXISTS (SELECT 1 FROM weekend_campaigns WHERE is_active = true AND v_today BETWEEN start_date AND end_date) INTO v_has_campaign;

  IF v_is_weekend AND NOT v_has_campaign THEN
    RETURN jsonb_build_object('success', false, 'message', 'Activities are paused on weekends. Come back Monday!');
  END IF;

  v_max_points := current_daily_cap();

  v_activity_type := CASE
    WHEN v_task.category IN ('partnership', 'ai', 'partnered') THEN 'partnered_task'
    WHEN v_task.category IN ('survey', 'market_research', 'feedback') THEN 'survey'
    ELSE 'regular_task'
  END;

  v_points_to_award := CASE v_activity_type
    WHEN 'partnered_task' THEN 75
    WHEN 'survey' THEN 15
    ELSE LEAST(COALESCE(v_task.points_reward, 13), 13)
  END;

  INSERT INTO daily_activity_limits (user_id, activity_date) VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  SELECT * INTO v_activity FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = v_today;
  v_current_points := COALESCE(v_activity.total_points_earned, 0);

  IF v_current_points + v_points_to_award > v_max_points THEN
    RETURN jsonb_build_object('success', false, 'message', format('Daily earning limit reached (%s pts). Come back tomorrow!', v_max_points));
  END IF;

  CASE v_activity_type
    WHEN 'partnered_task' THEN v_max_for_type := 1; v_current_count := COALESCE(v_activity.ai_tasks_completed, 0);
    WHEN 'survey' THEN v_max_for_type := 3; v_current_count := COALESCE(v_activity.surveys_completed, 0);
    ELSE v_max_for_type := 2; v_current_count := COALESCE(v_activity.regular_tasks_completed, 0);
  END CASE;

  IF v_current_count >= v_max_for_type THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily limit reached for this activity type');
  END IF;

  CASE v_task.verification_type
    WHEN 'url' THEN
      IF p_verification_data->>'submitted_url' IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'URL submission required');
      END IF;
    WHEN 'screenshot' THEN
      IF p_verification_data->>'file_path' IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Screenshot submission required');
      END IF;
    ELSE NULL;
  END CASE;

  INSERT INTO user_tasks (user_id, task_id, status, completed_at, verification_data, points_earned)
  VALUES (p_user_id, p_task_id, 'completed', now(), p_verification_data, v_points_to_award)
  ON CONFLICT (user_id, task_id)
  DO UPDATE SET status = 'completed', completed_at = now(), verification_data = p_verification_data, points_earned = v_points_to_award;

  UPDATE wallets SET available_points = available_points + v_points_to_award WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + v_points_to_award WHERE id = p_user_id;

  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'task_completion', v_points_to_award, 'Completed task: ' || v_task.title, 'completed');

  PERFORM increment_daily_activity(p_user_id, v_activity_type, v_points_to_award);

  RETURN jsonb_build_object('success', true, 'message', 'Task completed!', 'points_awarded', v_points_to_award);
END;
$function$;