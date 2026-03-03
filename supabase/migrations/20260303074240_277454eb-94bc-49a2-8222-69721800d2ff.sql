
-- Create point_transfers table for P2P transfers
CREATE TABLE public.point_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  fee integer NOT NULL DEFAULT 0,
  verification_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.point_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers (sent or received)
CREATE POLICY "Users can view own transfers"
  ON public.point_transfers FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can create transfers they send
CREATE POLICY "Users can create transfers"
  ON public.point_transfers FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Admins can view all transfers
CREATE POLICY "Admins can view all transfers"
  ON public.point_transfers FOR SELECT
  USING (is_admin(auth.uid()));

-- Admins can update transfers (approve/reject)
CREATE POLICY "Admins can update transfers"
  ON public.point_transfers FOR UPDATE
  USING (is_admin(auth.uid()));

-- RPC: Initiate a point transfer
CREATE OR REPLACE FUNCTION public.initiate_point_transfer(
  p_sender_id uuid,
  p_recipient_email text,
  p_amount integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient record;
  v_sender_wallet record;
  v_fee integer;
  v_total integer;
  v_code text;
  v_transfer_id uuid;
BEGIN
  -- Validate amount
  IF p_amount < 50 THEN
    RETURN json_build_object('success', false, 'message', 'Minimum transfer is 50 points');
  END IF;

  -- Calculate fee (5% with minimum 10 points)
  v_fee := GREATEST(10, CEIL(p_amount * 0.05));
  v_total := p_amount + v_fee;

  -- Find recipient
  SELECT id, full_name, email INTO v_recipient
  FROM public.users
  WHERE email = p_recipient_email AND id != p_sender_id;

  IF v_recipient.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Recipient not found or cannot send to yourself');
  END IF;

  -- Check sender wallet
  SELECT available_points INTO v_sender_wallet
  FROM public.wallets
  WHERE user_id = p_sender_id;

  IF v_sender_wallet.available_points IS NULL OR v_sender_wallet.available_points < v_total THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient points. You need ' || v_total || ' points (' || p_amount || ' + ' || v_fee || ' fee)');
  END IF;

  -- Generate 5-digit verification code
  v_code := LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');

  -- Deduct from sender wallet (lock the points)
  UPDATE public.wallets
  SET available_points = available_points - v_total,
      locked_points = COALESCE(locked_points, 0) + v_total
  WHERE user_id = p_sender_id;

  -- Create transfer record
  INSERT INTO public.point_transfers (sender_id, recipient_id, amount, fee, verification_code, status)
  VALUES (p_sender_id, v_recipient.id, p_amount, v_fee, v_code, 'pending')
  RETURNING id INTO v_transfer_id;

  -- Create transaction record
  PERFORM public.create_transaction(
    p_user_id := p_sender_id,
    p_type := 'transfer_out',
    p_points_amount := -v_total,
    p_description := 'Point transfer to ' || COALESCE(v_recipient.full_name, v_recipient.email) || ' (pending)',
    p_status := 'pending'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Transfer initiated! Awaiting admin approval.',
    'transfer_id', v_transfer_id,
    'verification_code', v_code,
    'amount', p_amount,
    'fee', v_fee,
    'recipient_name', COALESCE(v_recipient.full_name, v_recipient.email)
  );
END;
$$;

-- RPC: Admin approve/reject transfer
CREATE OR REPLACE FUNCTION public.admin_review_transfer(
  p_transfer_id uuid,
  p_action text,
  p_admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer record;
  v_total integer;
BEGIN
  -- Check admin
  IF NOT is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Get transfer
  SELECT * INTO v_transfer FROM public.point_transfers WHERE id = p_transfer_id;
  IF v_transfer IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Transfer not found');
  END IF;

  IF v_transfer.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Transfer already processed');
  END IF;

  v_total := v_transfer.amount + v_transfer.fee;

  IF p_action = 'approve' THEN
    -- Move locked points: unlock from sender, credit recipient
    UPDATE public.wallets
    SET locked_points = COALESCE(locked_points, 0) - v_total
    WHERE user_id = v_transfer.sender_id;

    -- Credit recipient
    UPDATE public.wallets
    SET available_points = COALESCE(available_points, 0) + v_transfer.amount
    WHERE user_id = v_transfer.recipient_id;

    -- Update user total_points
    UPDATE public.users
    SET total_points = COALESCE(total_points, 0) + v_transfer.amount
    WHERE id = v_transfer.recipient_id;

    -- Update transfer status
    UPDATE public.point_transfers
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = p_admin_notes, updated_at = now()
    WHERE id = p_transfer_id;

    -- Create receive transaction
    PERFORM public.create_transaction(
      p_user_id := v_transfer.recipient_id,
      p_type := 'transfer_in',
      p_points_amount := v_transfer.amount,
      p_description := 'Point transfer received',
      p_status := 'completed'
    );

    RETURN json_build_object('success', true, 'message', 'Transfer approved and points credited');

  ELSIF p_action = 'reject' THEN
    -- Refund sender
    UPDATE public.wallets
    SET available_points = available_points + v_total,
        locked_points = COALESCE(locked_points, 0) - v_total
    WHERE user_id = v_transfer.sender_id;

    UPDATE public.point_transfers
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = p_admin_notes, updated_at = now()
    WHERE id = p_transfer_id;

    RETURN json_build_object('success', true, 'message', 'Transfer rejected and points refunded');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Invalid action. Use approve or reject.');
  END IF;
END;
$$;
