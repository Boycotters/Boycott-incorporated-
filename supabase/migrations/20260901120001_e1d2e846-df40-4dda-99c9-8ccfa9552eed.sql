
ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS unlock_type text NOT NULL DEFAULT 'purchase',
  ADD COLUMN IF NOT EXISTS unlock_achievement_id uuid REFERENCES public.achievements(id) ON DELETE SET NULL;

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

  IF COALESCE(v_reward.unlock_type, 'purchase') <> 'purchase' THEN
    RETURN json_build_object('success', false, 'message', 'This perk cannot be bought — unlock it by completing its challenge or achievement');
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

  RETURN json_build_object('success', true, 'message', 'Reward redeemed', 'redemption_id', v_redemption_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    tasks_count INTEGER;
    total_pts INTEGER;
    referrals_count INTEGER;
    user_level INTEGER;
    user_streak INTEGER;
    achievement_record RECORD;
    perk_record RECORD;
    awarded_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO tasks_count FROM user_tasks WHERE user_id = p_user_id AND status = 'completed';
    SELECT COALESCE(total_points, 0), COALESCE(level, 1), COALESCE(current_streak, 0)
    INTO total_pts, user_level, user_streak FROM users WHERE id = p_user_id;
    SELECT COUNT(*) INTO referrals_count FROM referrals WHERE referrer_id = p_user_id;

    FOR achievement_record IN SELECT * FROM achievements WHERE is_active = true LOOP
        IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = achievement_record.id) THEN
            CONTINUE;
        END IF;

        IF (achievement_record.requirement_type = 'tasks_completed' AND tasks_count >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'points_earned' AND total_pts >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'referrals_made' AND referrals_count >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'level_reached' AND user_level >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'streak_days' AND user_streak >= achievement_record.requirement_value)
        THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (p_user_id, achievement_record.id);

            IF achievement_record.points_reward > 0 THEN
                UPDATE wallets SET available_points = available_points + achievement_record.points_reward WHERE wallets.user_id = p_user_id;
                UPDATE users SET total_points = total_points + achievement_record.points_reward WHERE id = p_user_id;

                INSERT INTO transactions (user_id, type, points_amount, description, status)
                VALUES (p_user_id, 'achievement', achievement_record.points_reward, 'Achievement unlocked: ' || achievement_record.name, 'completed');
            END IF;

            -- Grant any perks linked to this achievement (permanent, no expiry)
            FOR perk_record IN
                SELECT * FROM rewards
                WHERE is_active = true
                  AND unlock_type = 'achievement'
                  AND unlock_achievement_id = achievement_record.id
            LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM user_inventory
                    WHERE user_id = p_user_id AND reward_id = perk_record.id
                ) THEN
                    INSERT INTO user_inventory (user_id, reward_id, item_type, expires_at)
                    VALUES (
                        p_user_id,
                        perk_record.id,
                        CASE
                            WHEN perk_record.name ILIKE '%frame%' THEN 'avatar_frame'
                            WHEN perk_record.name ILIKE '%badge%' THEN 'badge'
                            WHEN perk_record.name ILIKE '%theme%' THEN 'theme'
                            ELSE 'item'
                        END,
                        NULL
                    );
                END IF;
            END LOOP;

            awarded_count := awarded_count + 1;
        END IF;
    END LOOP;

    RETURN awarded_count;
END;
$function$;
