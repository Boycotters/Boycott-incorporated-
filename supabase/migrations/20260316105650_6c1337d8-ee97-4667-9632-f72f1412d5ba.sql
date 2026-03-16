-- Add transfer types to transactions check constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (
  type::text = ANY(ARRAY[
    'earn', 'cashout', 'withdrawal', 'refund', 'task_completion', 'daily_bonus',
    'streak_recovery', 'streak_milestone', 'achievement', 'referral_bonus',
    'survey_completion', 'video_reward', 'tier_upgrade', 'redemption', 'redeem',
    'game', 'game_reward', 'tournament_prize', 'transfer_out', 'transfer_in'
  ]::text[])
);

-- Update play_game to track daily limits
CREATE OR REPLACE FUNCTION public.play_game(p_user_id uuid, p_game_type text, p_points_earned integer, p_score integer DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plays_per_game INTEGER := 1; v_plays_today_this_game INTEGER; v_total_games_today INTEGER;
  v_user_tier VARCHAR; v_tier_multiplier NUMERIC := 1.0; v_final_points INTEGER; v_max_points INTEGER;
  v_max_daily_games INTEGER := 3;
BEGIN
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
    RETURN json_build_object('success', false, 'message', 'Daily game limit reached! You can play up to 3 games per day.', 'plays_remaining', 0);
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

-- Update complete_video_watch to track daily limits
CREATE OR REPLACE FUNCTION public.complete_video_watch(p_user_id uuid, p_video_id uuid, p_watch_duration integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_video RECORD; v_existing_view RECORD; v_points_to_award INTEGER; v_videos_today INTEGER; v_max_videos INTEGER := 5;
BEGIN
  SELECT * INTO v_video FROM videos WHERE id = p_video_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Video not found'); END IF;
  SELECT * INTO v_existing_view FROM user_video_views WHERE user_id = p_user_id AND video_id = p_video_id;
  IF FOUND AND v_existing_view.completed THEN RETURN jsonb_build_object('success', false, 'message', 'Already watched this video', 'already_completed', true); END IF;
  INSERT INTO daily_activity_limits (user_id, activity_date) VALUES (p_user_id, CURRENT_DATE) ON CONFLICT (user_id, activity_date) DO NOTHING;
  SELECT COALESCE(videos_watched, 0) INTO v_videos_today FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  IF v_videos_today >= v_max_videos THEN RETURN jsonb_build_object('success', false, 'message', 'Daily ad limit reached! You can watch up to 5 ads per day.'); END IF;
  IF p_watch_duration >= (v_video.duration_seconds * 0.8) THEN v_points_to_award := v_video.points_reward;
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

-- Update initiate_point_transfer with valid type and notification
CREATE OR REPLACE FUNCTION public.initiate_point_transfer(p_sender_id uuid, p_recipient_email text, p_amount integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_recipient record; v_sender record; v_sender_wallet record; v_fee integer; v_total integer; v_code text; v_transfer_id uuid;
BEGIN
  IF p_amount < 50 THEN RETURN json_build_object('success', false, 'message', 'Minimum transfer is 50 points'); END IF;
  v_fee := GREATEST(10, CEIL(p_amount * 0.05)); v_total := p_amount + v_fee;
  SELECT id, full_name, email INTO v_sender FROM public.users WHERE id = p_sender_id;
  SELECT id, full_name, email INTO v_recipient FROM public.users WHERE email = p_recipient_email AND id != p_sender_id;
  IF v_recipient.id IS NULL THEN RETURN json_build_object('success', false, 'message', 'Recipient not found or cannot send to yourself'); END IF;
  SELECT available_points INTO v_sender_wallet FROM public.wallets WHERE user_id = p_sender_id;
  IF v_sender_wallet.available_points IS NULL OR v_sender_wallet.available_points < v_total THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient points. You need ' || v_total || ' points (' || p_amount || ' + ' || v_fee || ' fee)');
  END IF;
  v_code := LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
  UPDATE public.wallets SET available_points = available_points - v_total, locked_points = COALESCE(locked_points, 0) + v_total WHERE user_id = p_sender_id;
  INSERT INTO public.point_transfers (sender_id, recipient_id, amount, fee, verification_code, status) VALUES (p_sender_id, v_recipient.id, p_amount, v_fee, v_code, 'pending') RETURNING id INTO v_transfer_id;
  INSERT INTO public.transactions (user_id, type, points_amount, description, status)
  VALUES (p_sender_id, 'transfer_out', -v_total, 'Point transfer to ' || COALESCE(v_recipient.full_name, v_recipient.email) || ' (pending)', 'pending');
  INSERT INTO public.notification_queue (user_id, title, body, data)
  VALUES (v_recipient.id, 'Points Received!', COALESCE(v_sender.full_name, v_sender.email) || ' sent you ' || p_amount || ' points! Awaiting admin approval.',
    jsonb_build_object('type', 'point_transfer', 'transfer_id', v_transfer_id, 'amount', p_amount));
  RETURN json_build_object('success', true, 'message', 'Transfer initiated! Awaiting admin approval.', 'transfer_id', v_transfer_id,
    'verification_code', v_code, 'amount', p_amount, 'fee', v_fee, 'recipient_name', COALESCE(v_recipient.full_name, v_recipient.email));
END; $$;

-- Update full award_survey_points to check daily limit
CREATE OR REPLACE FUNCTION public.award_survey_points(p_user_id uuid, p_points integer, p_survey_title text,
  p_survey_id text DEFAULT NULL, p_questions json DEFAULT '[]'::json, p_responses json DEFAULT '[]'::json, p_completion_time integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_level INTEGER; v_user_vip TEXT; v_surveys_today INTEGER; v_max_surveys INTEGER := 3;
BEGIN
  INSERT INTO daily_activity_limits (user_id, activity_date) VALUES (p_user_id, CURRENT_DATE) ON CONFLICT (user_id, activity_date) DO NOTHING;
  SELECT COALESCE(surveys_completed, 0) INTO v_surveys_today FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  IF v_surveys_today >= v_max_surveys THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily survey limit reached! You can complete up to 3 surveys per day.', 'points_awarded', 0);
  END IF;
  SELECT level, vip_tier INTO v_user_level, v_user_vip FROM users WHERE id = p_user_id;
  IF p_survey_id IS NOT NULL OR p_survey_title IS NOT NULL THEN
    INSERT INTO survey_responses (user_id, survey_id, survey_title, questions, responses, demographic_data, device_info, completion_time_seconds, points_awarded)
    VALUES (p_user_id, COALESCE(p_survey_id, 'ai_' || gen_random_uuid()::text), p_survey_title, p_questions, p_responses,
      jsonb_build_object('level', v_user_level, 'vip_tier', v_user_vip, 'completed_at', NOW()), '{}'::jsonb, p_completion_time, p_points);
  END IF;
  UPDATE wallets SET available_points = available_points + p_points WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + p_points WHERE id = p_user_id;
  UPDATE daily_activity_limits SET surveys_completed = COALESCE(surveys_completed, 0) + 1,
    total_points_earned = COALESCE(total_points_earned, 0) + p_points, updated_at = NOW()
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  INSERT INTO transactions (user_id, points_amount, type, description, status) VALUES (p_user_id, p_points, 'survey_completion', 'Completed survey: ' || p_survey_title, 'completed');
  RETURN jsonb_build_object('success', true, 'points_awarded', p_points, 'message', 'Points awarded successfully');
END; $$;
