-- Drop existing function that has wrong return type
DROP FUNCTION IF EXISTS check_daily_earning_cap(uuid);

-- Update check_daily_earning_cap with correct return type (JSON)
CREATE OR REPLACE FUNCTION check_daily_earning_cap(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limits JSONB;
BEGIN
  v_limits := check_comprehensive_daily_limits(p_user_id);
  
  RETURN json_build_object(
    'can_earn', NOT (v_limits->>'at_daily_cap')::boolean AND NOT (v_limits->>'at_weekly_cap')::boolean,
    'earned_today', (v_limits->>'earned_today')::integer,
    'daily_cap', (v_limits->>'max_daily')::integer,
    'remaining', LEAST((v_limits->>'remaining_today')::integer, (v_limits->>'remaining_week')::integer),
    'weekly_earned', (v_limits->>'earned_this_week')::integer,
    'weekly_cap', (v_limits->>'weekly_cap')::integer
  );
END;
$$;

-- Update request_withdrawal with 10% fee
CREATE OR REPLACE FUNCTION request_withdrawal(
  p_user_id UUID,
  p_amount INTEGER,
  p_provider TEXT,
  p_phone_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_balance INTEGER;
  v_fee_percentage NUMERIC := 0.10;  -- 10% fee
  v_fee INTEGER;
  v_net_amt INTEGER;
  v_withdrawal_id UUID;
  v_config JSONB;
BEGIN
  -- Get fee from config if available
  SELECT config INTO v_config FROM earning_algorithms WHERE name = 'daily_earning_limits' AND is_active = true;
  IF v_config IS NOT NULL AND v_config ? 'withdrawal_fee_percentage' THEN
    v_fee_percentage := (v_config->>'withdrawal_fee_percentage')::NUMERIC;
  END IF;
  
  -- Calculate fee and net amount
  v_fee := CEIL(p_amount * v_fee_percentage);
  v_net_amt := p_amount - v_fee;
  
  -- Check wallet balance
  SELECT available_points INTO v_wallet_balance FROM wallets WHERE user_id = p_user_id;
  
  IF v_wallet_balance IS NULL OR v_wallet_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient balance'
    );
  END IF;
  
  -- Minimum withdrawal check
  IF p_amount < 500 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Minimum withdrawal is 500 points'
    );
  END IF;
  
  -- Check pending withdrawals
  IF EXISTS (SELECT 1 FROM withdrawals WHERE user_id = p_user_id AND status = 'pending') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You already have a pending withdrawal'
    );
  END IF;
  
  -- Check eligibility
  IF NOT (check_withdrawal_eligibility(p_user_id)->>'eligible')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'message', (check_withdrawal_eligibility(p_user_id)->>'message')::text
    );
  END IF;
  
  -- Create withdrawal record
  INSERT INTO withdrawals (user_id, amount, fee, net_amount, provider, phone_number, status)
  VALUES (p_user_id, p_amount, v_fee, v_net_amt, p_provider, p_phone_number, 'pending')
  RETURNING id INTO v_withdrawal_id;
  
  -- Lock points in wallet
  UPDATE wallets
  SET available_points = available_points - p_amount,
      locked_points = COALESCE(locked_points, 0) + p_amount
  WHERE user_id = p_user_id;
  
  -- Create transaction record
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
$$;