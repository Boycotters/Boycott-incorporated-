
-- Streak shields table for VIP users (FR-STRK-004)
CREATE TABLE IF NOT EXISTS public.streak_shields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL, -- e.g. '2026-03'
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE public.streak_shields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak shields" ON public.streak_shields
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak shields" ON public.streak_shields
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak shields" ON public.streak_shields
  FOR UPDATE USING (auth.uid() = user_id);

-- Fraud flagging function for 3+ redemptions in 24h (SEC-004)
CREATE OR REPLACE FUNCTION public.check_redemption_fraud(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
  is_flagged boolean := false;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM redemptions
  WHERE user_id = p_user_id
    AND created_at > now() - interval '24 hours';
  
  IF recent_count >= 3 THEN
    is_flagged := true;
    -- Log the flag
    INSERT INTO admin_activity_logs (admin_user_id, action, entity_type, entity_id, details)
    VALUES (p_user_id, 'fraud_flag_redemption', 'user', p_user_id::text, 
      jsonb_build_object('reason', 'More than 3 redemptions in 24 hours', 'count', recent_count));
  END IF;
  
  RETURN jsonb_build_object(
    'flagged', is_flagged,
    'recent_count', recent_count,
    'threshold', 3
  );
END;
$$;

-- Point expiry function (FR-PTS-006) - check if user has been inactive for 12 months
CREATE OR REPLACE FUNCTION public.check_point_expiry_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_activity timestamp;
  months_inactive integer;
  is_at_risk boolean := false;
BEGIN
  SELECT GREATEST(
    COALESCE((SELECT MAX(completed_at) FROM user_tasks WHERE user_id = p_user_id), '2000-01-01'),
    COALESCE((SELECT MAX(played_at) FROM user_game_plays WHERE user_id = p_user_id), '2000-01-01'),
    COALESCE((SELECT MAX(created_at) FROM transactions WHERE user_id = p_user_id), '2000-01-01')
  ) INTO last_activity;
  
  months_inactive := EXTRACT(MONTH FROM age(now(), last_activity));
  
  IF months_inactive >= 10 THEN
    is_at_risk := true;
  END IF;
  
  RETURN jsonb_build_object(
    'last_activity', last_activity,
    'months_inactive', months_inactive,
    'at_risk', is_at_risk,
    'expiry_months', 12
  );
END;
$$;

-- Use streak shield function
CREATE OR REPLACE FUNCTION public.use_streak_shield(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month text;
  user_vip text;
  shield_exists boolean;
  shield_used boolean;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Check if user is Platinum/Diamond VIP
  SELECT vip_tier INTO user_vip FROM users WHERE id = p_user_id;
  
  IF user_vip NOT IN ('platinum', 'diamond') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Streak shields are only available for Platinum and Diamond VIP members');
  END IF;
  
  -- Check if shield exists for this month
  SELECT EXISTS(
    SELECT 1 FROM streak_shields WHERE user_id = p_user_id AND month_year = current_month
  ) INTO shield_exists;
  
  IF shield_exists THEN
    -- Check if already used
    SELECT used_at IS NOT NULL INTO shield_used
    FROM streak_shields WHERE user_id = p_user_id AND month_year = current_month;
    
    IF shield_used THEN
      RETURN jsonb_build_object('success', false, 'message', 'You have already used your streak shield this month');
    END IF;
  ELSE
    -- Create the shield for this month
    INSERT INTO streak_shields (user_id, month_year) VALUES (p_user_id, current_month);
  END IF;
  
  -- Use the shield
  UPDATE streak_shields SET used_at = now() WHERE user_id = p_user_id AND month_year = current_month;
  
  RETURN jsonb_build_object('success', true, 'message', 'Streak shield activated! Your streak is protected for today.');
END;
$$;
