
-- 1. Lower referral bonus from 100 -> 50
ALTER TABLE public.referrals ALTER COLUMN bonus_points SET DEFAULT 50;

CREATE OR REPLACE FUNCTION public.process_referral(referrer_code character varying, new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    referrer_user_id UUID;
    bonus_points INTEGER := 50;
BEGIN
    SELECT id INTO referrer_user_id FROM users WHERE UPPER(referral_code) = UPPER(referrer_code);
    IF referrer_user_id IS NULL THEN RETURN FALSE; END IF;
    IF referrer_user_id = new_user_id THEN RETURN FALSE; END IF;
    IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = new_user_id) THEN RETURN FALSE; END IF;

    INSERT INTO referrals (referrer_id, referred_id, bonus_points, status)
    VALUES (referrer_user_id, new_user_id, bonus_points, 'completed');

    UPDATE wallets SET available_points = available_points + bonus_points WHERE user_id = referrer_user_id;
    UPDATE users SET total_points = total_points + bonus_points WHERE id = referrer_user_id;

    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (referrer_user_id, 'referral_bonus', bonus_points, 'Referral bonus for inviting a friend', 'completed');

    RETURN TRUE;
END;
$function$;

-- 2. VIP upgrade RPC: pay points to instantly jump to a tier
CREATE OR REPLACE FUNCTION public.request_vip_upgrade(p_user_id uuid, p_target_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target record;
  v_current_slug text;
  v_wallet record;
BEGIN
  IF p_user_id IS NULL OR auth.uid() <> p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Not authorized');
  END IF;

  SELECT slug, name, upgrade_cost, min_points INTO v_target
  FROM public.vip_tiers WHERE slug = p_target_slug;

  IF v_target.slug IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Tier not found');
  END IF;

  IF v_target.upgrade_cost IS NULL OR v_target.upgrade_cost <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'This tier cannot be purchased');
  END IF;

  SELECT vip_tier INTO v_current_slug FROM public.users WHERE id = p_user_id;
  IF v_current_slug = v_target.slug THEN
    RETURN json_build_object('success', false, 'message', 'You are already on this tier');
  END IF;

  SELECT available_points INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  IF v_wallet.available_points IS NULL OR v_wallet.available_points < v_target.upgrade_cost THEN
    RETURN json_build_object('success', false, 'message',
      'Not enough points. Need ' || v_target.upgrade_cost || ' pts');
  END IF;

  -- Deduct & promote
  UPDATE public.wallets
    SET available_points = available_points - v_target.upgrade_cost
    WHERE user_id = p_user_id;

  UPDATE public.users SET vip_tier = v_target.slug WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'vip_upgrade', -v_target.upgrade_cost,
          'VIP upgrade to ' || v_target.name, 'completed');

  -- Notify the user
  INSERT INTO public.notification_queue (user_id, title, body, data, status)
  VALUES (p_user_id, 'Welcome to ' || v_target.name || ' 👑',
          'Your VIP tier has been upgraded. Enjoy the perks!',
          jsonb_build_object('type','vip_upgrade','tier',v_target.slug),
          'pending');

  RETURN json_build_object(
    'success', true,
    'message', 'Upgraded to ' || v_target.name,
    'tier', v_target.slug,
    'cost', v_target.upgrade_cost
  );
END;
$$;
