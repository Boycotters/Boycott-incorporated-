-- Create withdrawals table for tracking withdrawal requests
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL,
  provider VARCHAR NOT NULL CHECK (provider IN ('airtel', 'mtn', 'zamtel')),
  phone_number VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT withdrawals_positive_amount CHECK (amount >= 500),
  CONSTRAINT withdrawals_positive_net CHECK (net_amount > 0)
);

-- Enable Row Level Security
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawals
CREATE POLICY "Users can view own withdrawals"
ON public.withdrawals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own withdrawals
CREATE POLICY "Users can insert own withdrawals"
ON public.withdrawals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);

-- Create a function to process withdrawal requests
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_user_id UUID,
  p_amount INTEGER,
  p_provider VARCHAR,
  p_phone_number VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_pts INTEGER;
  fee_amount INTEGER;
  net_amt INTEGER;
  min_withdrawal INTEGER := 500;
  fee_percentage NUMERIC := 0.05;
  withdrawal_id UUID;
  result JSON;
BEGIN
  -- Get available points
  SELECT available_points INTO available_pts
  FROM wallets
  WHERE user_id = p_user_id;
  
  IF available_pts IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'wallet_not_found', 'message', 'Wallet not found');
  END IF;
  
  -- Check minimum withdrawal
  IF p_amount < min_withdrawal THEN
    RETURN json_build_object('success', false, 'error', 'below_minimum', 'message', 'Minimum withdrawal is ' || min_withdrawal || ' points');
  END IF;
  
  -- Check sufficient balance
  IF available_pts < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_balance', 'message', 'Insufficient balance. You have ' || available_pts || ' points');
  END IF;
  
  -- Calculate fee (5%)
  fee_amount := CEIL(p_amount * fee_percentage);
  net_amt := p_amount - fee_amount;
  
  -- Lock the points in wallet
  UPDATE wallets 
  SET available_points = available_points - p_amount,
      locked_points = locked_points + p_amount
  WHERE user_id = p_user_id;
  
  -- Create withdrawal record
  INSERT INTO withdrawals (user_id, amount, fee, net_amount, provider, phone_number, status)
  VALUES (p_user_id, p_amount, fee_amount, net_amt, p_provider, p_phone_number, 'pending')
  RETURNING id INTO withdrawal_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'withdrawal', -p_amount, 'Withdrawal request via ' || UPPER(p_provider) || ' to ' || p_phone_number, 'pending');
  
  RETURN json_build_object(
    'success', true,
    'message', 'Withdrawal request submitted successfully',
    'withdrawal_id', withdrawal_id,
    'amount', p_amount,
    'fee', fee_amount,
    'net_amount', net_amt,
    'provider', p_provider
  );
END;
$$;