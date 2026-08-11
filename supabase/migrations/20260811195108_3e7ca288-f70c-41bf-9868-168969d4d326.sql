
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'marketplace';

CREATE OR REPLACE FUNCTION public.check_withdrawal_eligibility(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_wallet_record RECORD;
  v_referral_count integer := 0;
  v_pending integer := 0;
  v_completed_withdrawals integer := 0;
  v_phone_verified boolean;
  v_kyc_status text;
BEGIN
  SELECT * INTO v_user_record FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'User not found', 'message', 'User not found');
  END IF;

  SELECT COUNT(*) INTO v_referral_count
  FROM referrals WHERE referrer_id = p_user_id AND status = 'completed';

  SELECT COUNT(*) INTO v_completed_withdrawals
  FROM withdrawals WHERE user_id = p_user_id AND status IN ('completed', 'processing');

  SELECT status INTO v_kyc_status FROM kyc_verifications WHERE user_id = p_user_id;
  v_phone_verified := COALESCE(v_user_record.phone_verified, false);

  IF v_user_record.is_banned THEN
    RETURN json_build_object('eligible', false, 'reason', 'Account is suspended', 'message', 'Account is suspended',
      'referral_count', v_referral_count, 'required_referrals', 2,
      'phone_required', v_completed_withdrawals >= 1, 'is_verified', v_phone_verified,
      'completed_withdrawals', v_completed_withdrawals, 'kyc_status', COALESCE(v_kyc_status, 'none'));
  END IF;

  IF v_kyc_status IS NULL OR v_kyc_status <> 'approved' THEN
    RETURN json_build_object(
      'eligible', false,
      'requirement', 'kyc',
      'reason', CASE
        WHEN v_kyc_status IS NULL THEN 'Identity verification (KYC) required'
        WHEN v_kyc_status = 'pending' THEN 'Your identity verification is under review'
        ELSE 'Your identity verification was rejected — please resubmit'
      END,
      'message', 'Identity verification required',
      'kyc_status', COALESCE(v_kyc_status, 'none'),
      'referral_count', v_referral_count, 'required_referrals', 2,
      'phone_required', v_completed_withdrawals >= 1, 'is_verified', v_phone_verified,
      'completed_withdrawals', v_completed_withdrawals);
  END IF;

  IF v_completed_withdrawals = 0 AND v_referral_count < 2 THEN
    RETURN json_build_object('eligible', false, 'requirement', 'referrals',
      'reason', 'Refer 2 friends to unlock your first withdrawal',
      'message', 'Refer 2 friends to unlock your first withdrawal',
      'referral_count', v_referral_count, 'required_referrals', 2,
      'remaining_referrals', 2 - v_referral_count,
      'phone_required', false, 'is_verified', v_phone_verified,
      'completed_withdrawals', v_completed_withdrawals, 'kyc_status', v_kyc_status);
  END IF;

  -- Phone verification only required from the second withdrawal onwards
  IF v_completed_withdrawals >= 1 AND NOT v_phone_verified THEN
    RETURN json_build_object('eligible', false, 'requirement', 'phone_verification',
      'reason', 'Verify your phone number to continue withdrawing',
      'message', 'Verify your phone number to continue withdrawing',
      'referral_count', v_referral_count, 'required_referrals', 2,
      'phone_required', true, 'is_verified', false,
      'completed_withdrawals', v_completed_withdrawals, 'kyc_status', v_kyc_status);
  END IF;

  SELECT * INTO v_wallet_record FROM wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'No wallet found', 'message', 'No wallet found',
      'referral_count', v_referral_count, 'required_referrals', 2,
      'phone_required', v_completed_withdrawals >= 1, 'is_verified', v_phone_verified,
      'completed_withdrawals', v_completed_withdrawals);
  END IF;

  IF COALESCE(v_wallet_record.available_points, 0) < 100 THEN
    RETURN json_build_object('eligible', false, 'requirement', 'balance',
      'reason', 'Minimum 100 points (K10) required',
      'message', 'Minimum 100 points (K10) required',
      'current', COALESCE(v_wallet_record.available_points, 0), 'required', 100,
      'referral_count', v_referral_count, 'required_referrals', 2,
      'phone_required', v_completed_withdrawals >= 1, 'is_verified', v_phone_verified,
      'completed_withdrawals', v_completed_withdrawals);
  END IF;

  SELECT COUNT(*) INTO v_pending FROM withdrawals WHERE user_id = p_user_id AND status = 'pending';
  IF v_pending > 0 THEN
    RETURN json_build_object('eligible', false, 'reason', 'You have a pending withdrawal',
      'message', 'You have a pending withdrawal',
      'referral_count', v_referral_count, 'required_referrals', 2,
      'phone_required', v_completed_withdrawals >= 1, 'is_verified', v_phone_verified,
      'completed_withdrawals', v_completed_withdrawals);
  END IF;

  RETURN json_build_object('eligible', true, 'message', 'Eligible',
    'available_points', v_wallet_record.available_points,
    'referral_count', v_referral_count, 'required_referrals', 2,
    'phone_required', v_completed_withdrawals >= 1, 'is_verified', v_phone_verified,
    'completed_withdrawals', v_completed_withdrawals, 'kyc_status', v_kyc_status);
END;
$$;

-- VIP tier: never demote a member; only auto-promote by points
CREATE OR REPLACE FUNCTION public.update_user_vip_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_computed text;
  v_current_min integer;
  v_computed_min integer;
BEGIN
  v_computed := get_user_vip_tier(NEW.total_points);

  IF NEW.vip_tier IS NULL THEN
    NEW.vip_tier := v_computed;
    RETURN NEW;
  END IF;

  SELECT min_points INTO v_current_min FROM vip_tiers WHERE slug = NEW.vip_tier;
  SELECT min_points INTO v_computed_min FROM vip_tiers WHERE slug = v_computed;

  IF COALESCE(v_computed_min, 0) > COALESCE(v_current_min, 0) THEN
    NEW.vip_tier := v_computed;
  END IF;

  RETURN NEW;
END;
$$;
