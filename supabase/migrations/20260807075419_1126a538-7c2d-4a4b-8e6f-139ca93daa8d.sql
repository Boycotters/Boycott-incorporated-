CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  nrc_number text NOT NULL,
  date_of_birth date,
  address text,
  city text,
  province text,
  id_front_path text,
  id_back_path text,
  selfie_path text,
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own kyc" ON public.kyc_verifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users submit own kyc" ON public.kyc_verifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users update own pending kyc" ON public.kyc_verifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending','rejected'))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage kyc" ON public.kyc_verifications
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER kyc_verifications_set_updated_at
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for private kyc-documents bucket (files stored under <user_id>/...)
CREATE POLICY "kyc upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc read own or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())));

CREATE POLICY "kyc update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admin review function
CREATE OR REPLACE FUNCTION public.admin_review_kyc(p_payload jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid := (p_payload->>'kyc_id')::uuid;
  v_status text := p_payload->>'status';
  v_notes text := p_payload->>'notes';
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  IF v_status NOT IN ('approved','rejected','pending') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid status');
  END IF;

  UPDATE public.kyc_verifications
  SET status = v_status,
      review_notes = v_notes,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = v_id;

  RETURN json_build_object('success', true, 'status', v_status);
END;
$$;

-- Require approved KYC for withdrawals
CREATE OR REPLACE FUNCTION public.check_withdrawal_eligibility(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_record RECORD;
  v_wallet_record RECORD;
  v_referral_count integer;
  v_pending_withdrawals integer;
  v_phone_verified boolean;
  v_kyc_status text;
BEGIN
  SELECT * INTO v_user_record FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'User not found');
  END IF;

  IF v_user_record.is_banned THEN
    RETURN json_build_object('eligible', false, 'reason', 'Account is suspended');
  END IF;

  v_phone_verified := COALESCE(v_user_record.phone_verified, false);
  IF NOT v_phone_verified THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'Phone verification required',
      'requirement', 'phone_verification'
    );
  END IF;

  SELECT status INTO v_kyc_status FROM kyc_verifications WHERE user_id = p_user_id;
  IF v_kyc_status IS NULL OR v_kyc_status <> 'approved' THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', CASE
        WHEN v_kyc_status IS NULL THEN 'Identity verification (KYC) required'
        WHEN v_kyc_status = 'pending' THEN 'Your identity verification is under review'
        ELSE 'Your identity verification was rejected — please resubmit'
      END,
      'requirement', 'kyc',
      'kyc_status', COALESCE(v_kyc_status, 'none')
    );
  END IF;

  SELECT * INTO v_wallet_record FROM wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'No wallet found');
  END IF;

  SELECT COUNT(*) INTO v_referral_count
  FROM referrals
  WHERE referrer_id = p_user_id AND status = 'completed';

  SELECT COUNT(*) INTO v_pending_withdrawals
  FROM withdrawals
  WHERE user_id = p_user_id AND status IN ('completed', 'processing');

  IF v_pending_withdrawals = 0 AND v_referral_count < 2 THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'Refer 2 friends to unlock your first withdrawal',
      'requirement', 'referrals',
      'current', v_referral_count,
      'required', 2
    );
  END IF;

  IF COALESCE(v_wallet_record.available_points, 0) < 100 THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'Minimum 100 points (K10) required',
      'requirement', 'balance',
      'current', COALESCE(v_wallet_record.available_points, 0),
      'required', 100
    );
  END IF;

  SELECT COUNT(*) INTO v_pending_withdrawals
  FROM withdrawals
  WHERE user_id = p_user_id AND status = 'pending';

  IF v_pending_withdrawals > 0 THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'You have a pending withdrawal'
    );
  END IF;

  RETURN json_build_object(
    'eligible', true,
    'available_points', v_wallet_record.available_points,
    'referral_count', v_referral_count
  );
END;
$function$;