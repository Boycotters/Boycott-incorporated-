-- Add 'redeem' to allowed transaction types
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (
  type IN (
    'earn',
    'cashout', 
    'withdrawal',
    'refund',
    'task_completion',
    'daily_bonus',
    'streak_recovery',
    'streak_milestone',
    'achievement',
    'referral_bonus',
    'survey_completion',
    'video_reward',
    'tier_upgrade',
    'redemption',
    'redeem'
  )
);

-- Create a secure redeem_reward function
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_user_id uuid,
  p_reward_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reward RECORD;
  v_available_points INTEGER;
BEGIN
  -- Get reward details
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reward not found or inactive');
  END IF;
  
  -- Check stock
  IF v_reward.stock <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reward out of stock');
  END IF;
  
  -- Get user's available points
  SELECT available_points INTO v_available_points FROM wallets WHERE user_id = p_user_id;
  
  IF v_available_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
  END IF;
  
  -- Check sufficient balance
  IF v_available_points < v_reward.points_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points. You need ' || v_reward.points_cost || ' points');
  END IF;
  
  -- Deduct points from wallet
  UPDATE wallets 
  SET available_points = available_points - v_reward.points_cost
  WHERE user_id = p_user_id;
  
  -- Update stock
  UPDATE rewards 
  SET stock = stock - 1
  WHERE id = p_reward_id;
  
  -- Create redemption record
  INSERT INTO redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, 'pending');
  
  -- Log transaction
  INSERT INTO transactions (user_id, points_amount, type, description, reference_id, status)
  VALUES (p_user_id, -v_reward.points_cost, 'redemption', 'Redeemed: ' || v_reward.name, p_reward_id, 'completed');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward redeemed successfully!',
    'reward_name', v_reward.name,
    'points_spent', v_reward.points_cost
  );
END;
$function$;