
-- 1) Fix duplicate request_withdrawal overload (varchar version) and align minimums to 100 pts
DROP FUNCTION IF EXISTS public.request_withdrawal(uuid, integer, character varying, character varying);

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_user_id uuid, p_amount integer, p_provider text, p_phone_number text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_wallet_balance INTEGER;
  v_fee_percentage NUMERIC := 0.10;
  v_fee INTEGER;
  v_net_amt INTEGER;
  v_withdrawal_id UUID;
  v_config JSONB;
  v_eligibility JSON;
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  v_eligibility := check_withdrawal_eligibility(p_user_id);
  IF NOT COALESCE((v_eligibility->>'eligible')::boolean, false) THEN
    RETURN json_build_object('success', false, 'message', COALESCE(v_eligibility->>'reason', 'Not eligible'));
  END IF;

  SELECT config INTO v_config FROM earning_algorithms WHERE name = 'daily_earning_limits' AND is_active = true;
  IF v_config IS NOT NULL AND v_config ? 'withdrawal_fee_percentage' THEN
    v_fee_percentage := (v_config->>'withdrawal_fee_percentage')::NUMERIC;
  END IF;

  IF p_amount < 100 THEN
    RETURN json_build_object('success', false, 'message', 'Minimum withdrawal is 100 points (K10)');
  END IF;

  SELECT available_points INTO v_wallet_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  IF EXISTS (SELECT 1 FROM withdrawals WHERE user_id = p_user_id AND status = 'pending') THEN
    RETURN json_build_object('success', false, 'message', 'You already have a pending withdrawal');
  END IF;

  v_fee := CEIL(p_amount * v_fee_percentage);
  v_net_amt := p_amount - v_fee;

  INSERT INTO withdrawals (user_id, amount, fee, net_amount, provider, phone_number, status)
  VALUES (p_user_id, p_amount, v_fee, v_net_amt, p_provider, p_phone_number, 'pending')
  RETURNING id INTO v_withdrawal_id;

  UPDATE wallets
  SET available_points = available_points - p_amount,
      locked_points = COALESCE(locked_points, 0) + p_amount
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, type, points_amount, description, status, reference_id)
  VALUES (p_user_id, 'withdrawal', -p_amount, 'Withdrawal request to ' || p_provider, 'pending', v_withdrawal_id::text);

  RETURN json_build_object(
    'success', true,
    'message', 'Withdrawal request submitted successfully',
    'withdrawal_id', v_withdrawal_id,
    'amount', p_amount,
    'fee', v_fee,
    'fee_percentage', v_fee_percentage * 100,
    'net_amount', v_net_amt
  );
END;
$function$;

-- 2) Fix complete_video_watch to use per-day unique constraint and per-day duplicate check
CREATE OR REPLACE FUNCTION public.complete_video_watch(p_user_id uuid, p_video_id uuid, p_watch_duration integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_video RECORD;
  v_existing RECORD;
  v_points INTEGER;
  v_today INTEGER;
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

  -- Only block if watched TODAY (per-day watch)
  SELECT * INTO v_existing
  FROM user_video_views
  WHERE user_id = p_user_id AND video_id = p_video_id AND watched_date = CURRENT_DATE;
  IF FOUND AND v_existing.completed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already watched today', 'already_completed', true);
  END IF;

  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  SELECT COALESCE(videos_watched, 0) INTO v_today
  FROM daily_activity_limits WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;

  IF v_today >= v_max THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily video limit reached');
  END IF;

  v_required := GREATEST(COALESCE(v_video.duration_seconds, 0), 1) * 0.8;
  IF p_watch_duration < v_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Watch at least %s seconds to earn points', CEIL(v_required)::int),
      'required_seconds', CEIL(v_required)::int
    );
  END IF;

  v_points := LEAST(COALESCE(v_video.points_reward, 0), 50);

  INSERT INTO user_video_views (user_id, video_id, watch_duration_seconds, completed, points_awarded, watched_date)
  VALUES (p_user_id, p_video_id, p_watch_duration, true, v_points, CURRENT_DATE)
  ON CONFLICT (user_id, video_id, watched_date)
  DO UPDATE SET watch_duration_seconds = EXCLUDED.watch_duration_seconds,
                completed = true,
                points_awarded = v_points,
                watched_at = now();

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

-- 3) Every VIP tier gets exactly 1 game play per attempt (single try per game)
UPDATE vip_tiers SET game_plays_per_attempt = 1;

-- 4) Redeem: give every redeemed item a 30-day expiry (physical + digital)
CREATE OR REPLACE FUNCTION public.redeem_reward(p_user_id uuid, p_reward_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_reward RECORD;
  v_wallet RECORD;
  v_redemption_id UUID;
  v_item_type TEXT;
  v_expires_at TIMESTAMPTZ := now() + interval '30 days';
BEGIN
  IF v_caller IS NULL OR v_caller <> p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Reward not found or inactive');
  END IF;
  IF v_reward.stock <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'This reward is out of stock');
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet IS NULL OR v_wallet.available_points < v_reward.points_cost THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient points');
  END IF;

  UPDATE wallets SET available_points = available_points - v_reward.points_cost WHERE user_id = p_user_id;
  UPDATE rewards SET stock = stock - 1 WHERE id = p_reward_id;

  INSERT INTO redemptions (user_id, reward_id, points_spent, status, expires_at)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, 'completed', v_expires_at)
  RETURNING id INTO v_redemption_id;

  v_item_type := CASE
    WHEN v_reward.name ILIKE '%frame%' THEN 'avatar_frame'
    WHEN v_reward.name ILIKE '%badge%' THEN 'badge'
    WHEN v_reward.name ILIKE '%theme%' THEN 'theme'
    ELSE 'item'
  END;

  INSERT INTO user_inventory (user_id, reward_id, item_type, redemption_id, expires_at)
  VALUES (p_user_id, p_reward_id, v_item_type, v_redemption_id, v_expires_at);

  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'redemption', -v_reward.points_cost, 'Redeemed: ' || v_reward.name, 'completed');

  RETURN json_build_object(
    'success', true,
    'message', 'Reward redeemed successfully',
    'reward_name', v_reward.name,
    'points_spent', v_reward.points_cost,
    'expires_at', v_expires_at
  );
END;
$function$;

-- Ensure redemptions has expires_at column
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
