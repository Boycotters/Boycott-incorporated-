-- Update referral requirement from 3 to 2
CREATE OR REPLACE FUNCTION public.check_withdrawal_eligibility(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_wallet_record RECORD;
  v_referral_count integer;
  v_pending_withdrawals integer;
  v_phone_verified boolean;
BEGIN
  -- Get user info
  SELECT * INTO v_user_record FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'User not found');
  END IF;
  
  -- Check if user is banned
  IF v_user_record.is_banned THEN
    RETURN json_build_object('eligible', false, 'reason', 'Account is suspended');
  END IF;
  
  -- Check phone verification
  v_phone_verified := COALESCE(v_user_record.phone_verified, false);
  IF NOT v_phone_verified THEN
    RETURN json_build_object(
      'eligible', false, 
      'reason', 'Phone verification required',
      'requirement', 'phone_verification'
    );
  END IF;
  
  -- Get wallet info
  SELECT * INTO v_wallet_record FROM wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'No wallet found');
  END IF;
  
  -- Count successful referrals (changed from 3 to 2)
  SELECT COUNT(*) INTO v_referral_count
  FROM referrals
  WHERE referrer_id = p_user_id AND status = 'completed';
  
  -- Check if this is user's first withdrawal
  SELECT COUNT(*) INTO v_pending_withdrawals
  FROM withdrawals
  WHERE user_id = p_user_id AND status IN ('completed', 'processing');
  
  -- For first withdrawal, require 2 referrals (updated from 3)
  IF v_pending_withdrawals = 0 AND v_referral_count < 2 THEN
    RETURN json_build_object(
      'eligible', false, 
      'reason', 'Refer 2 friends to unlock your first withdrawal',
      'requirement', 'referrals',
      'current', v_referral_count,
      'required', 2
    );
  END IF;
  
  -- Check minimum withdrawal amount (100 points = K10)
  IF COALESCE(v_wallet_record.available_points, 0) < 100 THEN
    RETURN json_build_object(
      'eligible', false, 
      'reason', 'Minimum 100 points (K10) required',
      'requirement', 'balance',
      'current', COALESCE(v_wallet_record.available_points, 0),
      'required', 100
    );
  END IF;
  
  -- Check for pending withdrawals
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
$$;

-- Update the daily activity status function to support campaign-weighted algorithm
CREATE OR REPLACE FUNCTION public.get_daily_activity_status(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_day_of_week integer;
  v_is_weekend boolean;
  v_has_campaign boolean;
  v_campaign_multiplier numeric;
  v_activity RECORD;
  v_max_partnered integer;
  v_max_regular integer;
  v_max_surveys integer;
  v_max_videos integer;
  v_max_games integer;
  v_max_points integer := 180; -- Base daily cap
  v_campaign_points integer := 0;
  v_regular_points integer := 0;
BEGIN
  v_today := CURRENT_DATE;
  v_day_of_week := EXTRACT(DOW FROM v_today);
  v_is_weekend := v_day_of_week IN (0, 6); -- 0 = Sunday, 6 = Saturday
  
  -- Check for active weekend campaign
  SELECT EXISTS (
    SELECT 1 FROM weekend_campaigns 
    WHERE is_active = true 
    AND v_today BETWEEN start_date AND end_date
  ), COALESCE(
    (SELECT bonus_multiplier FROM weekend_campaigns 
     WHERE is_active = true 
     AND v_today BETWEEN start_date AND end_date
     LIMIT 1), 1.0
  ) INTO v_has_campaign, v_campaign_multiplier;
  
  -- Calculate campaign-weighted limits
  -- When campaign is active: campaigns get 45-50% of cap (90 points)
  -- Remaining 50-55% (90 points) distributed among other tasks
  IF v_has_campaign THEN
    v_campaign_points := 90; -- 50% of 180 for campaigns
    v_regular_points := 90;  -- 50% for other tasks
    
    -- Campaign allocation: 1 partnered task (20 pts) + 3 surveys (20 pts each) + 1 video (10 pts) = 90 pts
    v_max_partnered := 1;  -- 20 pts (part of campaign)
    v_max_surveys := 4;    -- 80 pts (includes campaign surveys)
    v_max_videos := 4;     -- 40 pts
    v_max_games := 4;      -- 40 pts max
    v_max_regular := 2;    -- 40 pts (digital tasks)
  ELSE
    -- Normal weekday distribution
    v_max_partnered := 1;  -- 20 pts
    v_max_regular := 2;    -- 40 pts
    v_max_surveys := 3;    -- 60 pts
    v_max_videos := 4;     -- 40 pts
    v_max_games := 4;      -- 40 pts max (200 total possible, but capped at 180)
  END IF;
  
  -- Get or create today's activity record
  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, v_today)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  
  SELECT * INTO v_activity 
  FROM daily_activity_limits 
  WHERE user_id = p_user_id AND activity_date = v_today;
  
  RETURN json_build_object(
    'partnered_tasks', json_build_object(
      'completed', COALESCE(v_activity.ai_tasks_completed, 0),
      'max', v_max_partnered,
      'remaining', GREATEST(0, v_max_partnered - COALESCE(v_activity.ai_tasks_completed, 0))
    ),
    'regular_tasks', json_build_object(
      'completed', COALESCE(v_activity.regular_tasks_completed, 0),
      'max', v_max_regular,
      'remaining', GREATEST(0, v_max_regular - COALESCE(v_activity.regular_tasks_completed, 0))
    ),
    'surveys', json_build_object(
      'completed', COALESCE(v_activity.surveys_completed, 0),
      'max', v_max_surveys,
      'remaining', GREATEST(0, v_max_surveys - COALESCE(v_activity.surveys_completed, 0))
    ),
    'videos', json_build_object(
      'completed', COALESCE(v_activity.videos_watched, 0),
      'max', v_max_videos,
      'remaining', GREATEST(0, v_max_videos - COALESCE(v_activity.videos_watched, 0))
    ),
    'games', json_build_object(
      'completed', COALESCE(v_activity.games_played, 0),
      'max', v_max_games,
      'remaining', GREATEST(0, v_max_games - COALESCE(v_activity.games_played, 0))
    ),
    'total_points', json_build_object(
      'earned', COALESCE(v_activity.total_points_earned, 0),
      'max', v_max_points,
      'remaining', GREATEST(0, v_max_points - COALESCE(v_activity.total_points_earned, 0))
    ),
    'is_weekend', v_is_weekend,
    'has_campaign', v_has_campaign,
    'campaign_multiplier', v_campaign_multiplier
  );
END;
$$;