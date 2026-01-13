-- =====================================================
-- COMPREHENSIVE EARNING ALGORITHM & REFERRAL WITHDRAWAL GATE
-- =====================================================

-- Update earning_algorithms with new 400 point daily cap
UPDATE earning_algorithms 
SET config = '{
  "max_daily_points": 400,
  "typical_target": 350,
  "soft_cap": 300,
  "daily_limits": {
    "surveys": 3,
    "games": 4,
    "videos": 4,
    "digital_tasks": 3
  },
  "points_per_type": {
    "survey": 50,
    "game": 25,
    "video": 25,
    "digital_task": 50
  },
  "login_bonus": 20
}'::jsonb,
description = 'Controls maximum daily earnings: 400pts cap (3 surveys @ 50pts, 4 games @ 25pts, 4 videos @ 25pts, 3 digital tasks @ 50pts)'
WHERE name = 'daily_earning_limits';

-- Function to check comprehensive daily limits
CREATE OR REPLACE FUNCTION check_comprehensive_daily_limits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
  v_max_daily INTEGER := 400;
  v_earned_today INTEGER := 0;
  v_surveys_today INTEGER := 0;
  v_games_today INTEGER := 0;
  v_videos_today INTEGER := 0;
  v_digital_tasks_today INTEGER := 0;
  v_survey_limit INTEGER := 3;
  v_game_limit INTEGER := 4;
  v_video_limit INTEGER := 4;
  v_digital_task_limit INTEGER := 3;
  v_survey_points INTEGER := 0;
  v_game_points INTEGER := 0;
  v_video_points INTEGER := 0;
  v_task_points INTEGER := 0;
BEGIN
  -- Get config
  SELECT config INTO v_config FROM earning_algorithms WHERE name = 'daily_earning_limits' AND is_active = true;
  
  IF v_config IS NOT NULL THEN
    v_max_daily := COALESCE((v_config->>'max_daily_points')::INTEGER, 400);
    v_survey_limit := COALESCE((v_config->'daily_limits'->>'surveys')::INTEGER, 3);
    v_game_limit := COALESCE((v_config->'daily_limits'->>'games')::INTEGER, 4);
    v_video_limit := COALESCE((v_config->'daily_limits'->>'videos')::INTEGER, 4);
    v_digital_task_limit := COALESCE((v_config->'daily_limits'->>'digital_tasks')::INTEGER, 3);
  END IF;
  
  -- Count surveys completed today
  SELECT COUNT(*), COALESCE(SUM(points_awarded), 0) INTO v_surveys_today, v_survey_points
  FROM survey_responses 
  WHERE user_id = p_user_id AND created_at::date = CURRENT_DATE;
  
  -- Count games played today
  SELECT COUNT(*), COALESCE(SUM(points_earned), 0) INTO v_games_today, v_game_points
  FROM user_game_plays 
  WHERE user_id = p_user_id AND played_at::date = CURRENT_DATE;
  
  -- Count videos watched today
  SELECT COUNT(*), COALESCE(SUM(points_awarded), 0) INTO v_videos_today, v_video_points
  FROM user_video_views 
  WHERE user_id = p_user_id AND completed = true AND watched_at::date = CURRENT_DATE;
  
  -- Count digital tasks completed today
  SELECT COUNT(*), COALESCE(SUM(points_earned), 0) INTO v_digital_tasks_today, v_task_points
  FROM user_tasks 
  WHERE user_id = p_user_id AND status = 'completed' AND completed_at::date = CURRENT_DATE;
  
  v_earned_today := v_survey_points + v_game_points + v_video_points + v_task_points;
  
  RETURN jsonb_build_object(
    'earned_today', v_earned_today,
    'max_daily', v_max_daily,
    'remaining', GREATEST(0, v_max_daily - v_earned_today),
    'at_cap', v_earned_today >= v_max_daily,
    'limits', jsonb_build_object(
      'surveys', jsonb_build_object('used', v_surveys_today, 'max', v_survey_limit, 'can_do', v_surveys_today < v_survey_limit),
      'games', jsonb_build_object('used', v_games_today, 'max', v_game_limit, 'can_do', v_games_today < v_game_limit),
      'videos', jsonb_build_object('used', v_videos_today, 'max', v_video_limit, 'can_do', v_videos_today < v_video_limit),
      'digital_tasks', jsonb_build_object('used', v_digital_tasks_today, 'max', v_digital_task_limit, 'can_do', v_digital_tasks_today < v_digital_task_limit)
    ),
    'breakdown', jsonb_build_object(
      'surveys', v_survey_points,
      'games', v_game_points,
      'videos', v_video_points,
      'tasks', v_task_points
    )
  );
END;
$$;

-- Update check_daily_earning_cap to use new limits
CREATE OR REPLACE FUNCTION check_daily_earning_cap(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN check_comprehensive_daily_limits(p_user_id);
END;
$$;

-- Function to check if user can withdraw (requires 3 referrals for first withdrawal)
CREATE OR REPLACE FUNCTION check_withdrawal_eligibility(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_count INTEGER := 0;
  v_has_withdrawn_before BOOLEAN := false;
  v_required_referrals INTEGER := 3;
  v_is_verified BOOLEAN := false;
BEGIN
  -- Check if user is verified
  SELECT is_verified INTO v_is_verified FROM users WHERE id = p_user_id;
  
  -- Count user's referrals
  SELECT COUNT(*) INTO v_referral_count 
  FROM referrals WHERE referrer_id = p_user_id AND status = 'completed';
  
  -- Check if user has any completed withdrawals
  SELECT EXISTS(
    SELECT 1 FROM withdrawals 
    WHERE user_id = p_user_id AND status IN ('completed', 'approved')
  ) INTO v_has_withdrawn_before;
  
  -- If they've withdrawn before, they don't need the referral requirement anymore
  IF v_has_withdrawn_before THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'reason', 'returning_user',
      'message', 'You are eligible to withdraw.',
      'referral_count', v_referral_count,
      'is_verified', v_is_verified
    );
  END IF;
  
  -- Check if email is verified
  IF NOT COALESCE(v_is_verified, false) THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'email_not_verified',
      'message', 'Please verify your email address before withdrawing.',
      'referral_count', v_referral_count,
      'required_referrals', v_required_referrals,
      'is_verified', v_is_verified
    );
  END IF;
  
  -- For first withdrawal, require 3 referrals
  IF v_referral_count < v_required_referrals THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'insufficient_referrals',
      'message', 'Invite ' || (v_required_referrals - v_referral_count) || ' more friends to unlock your first withdrawal.',
      'referral_count', v_referral_count,
      'required_referrals', v_required_referrals,
      'remaining_referrals', v_required_referrals - v_referral_count,
      'is_verified', v_is_verified
    );
  END IF;
  
  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'requirements_met',
    'message', 'You are eligible to withdraw.',
    'referral_count', v_referral_count,
    'is_verified', v_is_verified
  );
END;
$$;

-- Update request_withdrawal to check eligibility first
CREATE OR REPLACE FUNCTION request_withdrawal(
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
  v_eligibility JSONB;
BEGIN
  -- Check withdrawal eligibility first
  v_eligibility := check_withdrawal_eligibility(p_user_id);
  
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false, 
      'error', v_eligibility->>'reason', 
      'message', v_eligibility->>'message',
      'referral_count', v_eligibility->'referral_count',
      'required_referrals', v_eligibility->'required_referrals'
    );
  END IF;

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

-- Update process_referral to mark referred user and handle verification
CREATE OR REPLACE FUNCTION process_referral(
    referrer_code VARCHAR,
    new_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    referrer_user_id UUID;
    bonus_points INTEGER := 100;
BEGIN
    -- Find the referrer by their referral code (case insensitive)
    SELECT id INTO referrer_user_id
    FROM users
    WHERE UPPER(referral_code) = UPPER(referrer_code);
    
    -- If no referrer found, return false
    IF referrer_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Make sure user isn't referring themselves
    IF referrer_user_id = new_user_id THEN
        RETURN FALSE;
    END IF;
    
    -- Check if this user was already referred
    IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = new_user_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Create the referral record
    INSERT INTO referrals (referrer_id, referred_id, bonus_points, status)
    VALUES (referrer_user_id, new_user_id, bonus_points, 'completed');
    
    -- Award bonus points to the referrer's wallet
    UPDATE wallets 
    SET available_points = available_points + bonus_points
    WHERE user_id = referrer_user_id;
    
    -- Update referrer's total points
    UPDATE users 
    SET total_points = total_points + bonus_points
    WHERE id = referrer_user_id;
    
    -- Add transaction record for the referrer
    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (referrer_user_id, 'referral_bonus', bonus_points, 'Referral bonus for inviting a friend', 'completed');
    
    RETURN TRUE;
END;
$$;

-- Function to sync email verification status from auth.users
CREATE OR REPLACE FUNCTION sync_email_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users 
  SET is_verified = (NEW.raw_user_meta_data->>'email_verified')::boolean
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger to sync email verification (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_verification();