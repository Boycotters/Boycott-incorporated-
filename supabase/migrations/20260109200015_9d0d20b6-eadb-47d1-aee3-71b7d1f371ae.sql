-- =====================================================
-- FIX: Drop old play_game functions before recreating
-- =====================================================

-- Drop existing play_game functions with different signatures
DROP FUNCTION IF EXISTS play_game(UUID, VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS play_game(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.play_game(UUID, VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.play_game(UUID, TEXT, INTEGER, INTEGER);

-- 1. Add game_plays_per_tier column to vip_tiers for VIP-based game attempts
ALTER TABLE vip_tiers ADD COLUMN IF NOT EXISTS game_plays_per_attempt INTEGER DEFAULT 1;

-- Update game plays per tier (Bronze=1, Silver=2, Gold=3, Diamond=4, Platinum=5)
UPDATE vip_tiers SET game_plays_per_attempt = 1 WHERE slug = 'bronze';
UPDATE vip_tiers SET game_plays_per_attempt = 2 WHERE slug = 'silver';
UPDATE vip_tiers SET game_plays_per_attempt = 3 WHERE slug = 'gold';
UPDATE vip_tiers SET game_plays_per_attempt = 4 WHERE slug = 'diamond';
UPDATE vip_tiers SET game_plays_per_attempt = 5 WHERE slug = 'platinum';

-- 2. Create mobile_money_transactions table for tracking actual money transfers
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  withdrawal_id UUID REFERENCES withdrawals(id),
  user_id UUID NOT NULL,
  provider VARCHAR NOT NULL,
  phone_number VARCHAR NOT NULL,
  amount_zmw DECIMAL(10,2) NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  external_transaction_id VARCHAR,
  provider_response JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE mobile_money_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mobile money transactions" ON mobile_money_transactions;
CREATE POLICY "Users can view own mobile money transactions"
  ON mobile_money_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Create earning_algorithms table to store configurable algorithms
CREATE TABLE IF NOT EXISTS earning_algorithms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE earning_algorithms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view earning algorithms" ON earning_algorithms;
CREATE POLICY "Anyone can view earning algorithms"
  ON earning_algorithms FOR SELECT USING (true);

-- Insert the comprehensive algorithms
INSERT INTO earning_algorithms (name, description, config) VALUES
('daily_earning_limits', 'Controls maximum daily earnings across all activities', '{"max_daily_points": 500, "typical_target": 400, "soft_cap": 350, "tasks_allocation": 200, "games_allocation": 100, "surveys_allocation": 100, "videos_allocation": 50, "referrals_allocation": 50, "login_bonus": 20}'),
('task_type_distribution', 'Allocates tasks by type for balanced earning', '{"digital_tasks": {"percentage": 40, "max_per_day": 8, "avg_points": 25}, "survey_tasks": {"percentage": 25, "max_per_day": 3, "avg_points": 35}, "game_tasks": {"percentage": 15, "max_per_day": 4, "avg_points": 25}, "video_tasks": {"percentage": 10, "max_per_day": 5, "avg_points": 10}, "partnership_tasks": {"percentage": 10, "max_per_day": 2, "avg_points": 50}}'),
('task_pricing', 'Dynamic task pricing with diminishing returns', '{"base_rates": {"easy": {"min": 5, "max": 15}, "medium": {"min": 15, "max": 35}, "hard": {"min": 35, "max": 75}}, "completion_penalty": {"after_5_tasks": 0.9, "after_10_tasks": 0.75, "after_15_tasks": 0.5}, "category_multipliers": {"partnership": 1.5, "survey": 1.3, "digital": 1.0, "gaming": 0.8}}'),
('daily_limits', 'Comprehensive daily limits by activity type', '{"base_task_limit": 5, "tier_bonuses": {"bronze": 0, "silver": 3, "gold": 5, "diamond": 8, "platinum": 12}, "game_limits_per_game": {"bronze": 1, "silver": 2, "gold": 3, "diamond": 4, "platinum": 5}, "survey_limit": 3, "video_limit": 10, "max_total_actions": 30}'),
('campaign_first', 'Prioritizes high-value campaign tasks', '{"campaign_priority": true, "campaign_bonus_multiplier": 1.5, "show_campaigns_first": true, "reserve_slots_for_campaigns": 2, "campaign_categories": ["partnership", "sponsored"], "fallback_to_regular": true}'),
('digital_focused', 'Optimizes for digital task completion', '{"digital_task_priority": 1, "social_media_tasks": {"weight": 0.8, "max_daily": 5}, "app_install_tasks": {"weight": 0.6, "max_daily": 3}, "survey_tasks": {"weight": 0.4, "max_daily": 2}, "video_tasks": {"weight": 0.3, "max_daily": 8}}'),
('physical_focused', 'Optimizes for physical/location-based tasks', '{"physical_task_priority": 1, "location_based_tasks": {"weight": 0.9, "max_daily": 2}, "photo_verification_tasks": {"weight": 0.8, "max_daily": 3}, "time_based_tasks": {"weight": 0.6, "max_daily": 4}}')
ON CONFLICT (name) DO UPDATE SET config = EXCLUDED.config, updated_at = now();

-- 4. Updated get_game_plays_remaining function with VIP-based limits
DROP FUNCTION IF EXISTS get_game_plays_remaining(UUID);
CREATE OR REPLACE FUNCTION get_game_plays_remaining(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plays_per_game INTEGER := 1;
  v_user_tier VARCHAR;
  v_spin_played INTEGER;
  v_memory_played INTEGER;
  v_basketball_played INTEGER;
  v_keepy_played INTEGER;
BEGIN
  SELECT u.vip_tier INTO v_user_tier FROM users u WHERE id = p_user_id;
  
  SELECT COALESCE(game_plays_per_attempt, 1) INTO v_plays_per_game
  FROM vip_tiers WHERE slug = COALESCE(v_user_tier, 'bronze');
  
  SELECT COUNT(*) INTO v_spin_played FROM user_game_plays 
  WHERE user_id = p_user_id AND game_type = 'spin_wheel' AND played_at >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO v_memory_played FROM user_game_plays 
  WHERE user_id = p_user_id AND game_type = 'memory_match' AND played_at >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO v_basketball_played FROM user_game_plays 
  WHERE user_id = p_user_id AND game_type = 'basketball' AND played_at >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO v_keepy_played FROM user_game_plays 
  WHERE user_id = p_user_id AND game_type = 'keepy_uppy' AND played_at >= CURRENT_DATE;
  
  RETURN json_build_object(
    'spin_wheel', GREATEST(0, v_plays_per_game - v_spin_played),
    'memory_match', GREATEST(0, v_plays_per_game - v_memory_played),
    'basketball', GREATEST(0, v_plays_per_game - v_basketball_played),
    'keepy_uppy', GREATEST(0, v_plays_per_game - v_keepy_played),
    'max_per_game', v_plays_per_game,
    'vip_tier', v_user_tier
  );
END;
$$;

-- 5. Updated play_game function with proper signature
CREATE OR REPLACE FUNCTION play_game(
  p_user_id UUID,
  p_game_type TEXT,
  p_points_earned INTEGER,
  p_score INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plays_per_game INTEGER := 1;
  v_plays_today INTEGER;
  v_user_tier VARCHAR;
  v_tier_multiplier NUMERIC := 1.0;
  v_final_points INTEGER;
  v_max_points INTEGER;
BEGIN
  IF p_game_type NOT IN ('spin_wheel', 'memory_match', 'basketball', 'keepy_uppy') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid game type');
  END IF;
  
  SELECT u.vip_tier INTO v_user_tier FROM users u WHERE id = p_user_id;
  
  SELECT COALESCE(game_plays_per_attempt, 1), COALESCE(multiplier, 1.0) 
  INTO v_plays_per_game, v_tier_multiplier
  FROM vip_tiers WHERE slug = COALESCE(v_user_tier, 'bronze');
  
  SELECT COUNT(*) INTO v_plays_today
  FROM user_game_plays
  WHERE user_id = p_user_id AND game_type = p_game_type AND played_at >= CURRENT_DATE;
  
  IF v_plays_today >= v_plays_per_game THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Daily limit reached for %s. Upgrade VIP for more plays!', p_game_type),
      'plays_remaining', 0
    );
  END IF;
  
  CASE p_game_type
    WHEN 'spin_wheel' THEN v_max_points := 100;
    WHEN 'memory_match' THEN v_max_points := 95;
    WHEN 'basketball' THEN v_max_points := 80;
    WHEN 'keepy_uppy' THEN v_max_points := 100;
    ELSE v_max_points := 50;
  END CASE;
  
  v_final_points := LEAST(p_points_earned, v_max_points);
  v_final_points := GREATEST(v_final_points, 0);
  v_final_points := ROUND(v_final_points * v_tier_multiplier);
  
  INSERT INTO user_game_plays (user_id, game_type, score, points_earned, played_at)
  VALUES (p_user_id, p_game_type, p_score, v_final_points, now());
  
  UPDATE wallets SET available_points = available_points + v_final_points WHERE user_id = p_user_id;
  UPDATE users SET total_points = total_points + v_final_points WHERE id = p_user_id;
  
  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'game', v_final_points, format('%s game reward', p_game_type), 'completed');
  
  RETURN json_build_object(
    'success', true,
    'message', format('You earned %s points!', v_final_points),
    'points_earned', v_final_points,
    'plays_remaining', v_plays_per_game - v_plays_today - 1,
    'multiplier_applied', v_tier_multiplier
  );
END;
$$;

-- 6. Function to check daily earnings cap
CREATE OR REPLACE FUNCTION check_daily_earning_cap(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
  v_max_daily INTEGER := 500;
  v_soft_cap INTEGER := 350;
  v_earned_today INTEGER := 0;
  v_task_earnings INTEGER := 0;
  v_game_earnings INTEGER := 0;
BEGIN
  SELECT config INTO v_config FROM earning_algorithms WHERE name = 'daily_earning_limits' AND is_active = true;
  
  IF v_config IS NOT NULL THEN
    v_max_daily := (v_config->>'max_daily_points')::INTEGER;
    v_soft_cap := (v_config->>'soft_cap')::INTEGER;
  END IF;
  
  SELECT COALESCE(SUM(points_earned), 0) INTO v_task_earnings
  FROM user_tasks WHERE user_id = p_user_id AND status = 'completed' AND completed_at >= CURRENT_DATE;
  
  SELECT COALESCE(SUM(points_earned), 0) INTO v_game_earnings
  FROM user_game_plays WHERE user_id = p_user_id AND played_at >= CURRENT_DATE;
  
  v_earned_today := v_task_earnings + v_game_earnings;
  
  RETURN jsonb_build_object(
    'earned_today', v_earned_today,
    'max_daily', v_max_daily,
    'soft_cap', v_soft_cap,
    'remaining', GREATEST(0, v_max_daily - v_earned_today),
    'at_soft_cap', v_earned_today >= v_soft_cap,
    'at_hard_cap', v_earned_today >= v_max_daily,
    'breakdown', jsonb_build_object('tasks', v_task_earnings, 'games', v_game_earnings)
  );
END;
$$;

-- 7. Add scheduled tournaments
INSERT INTO game_tournaments (name, description, game_type, prize_pool, start_time, end_time, entry_fee, status, max_participants, prize_distribution) VALUES
('Morning Sprint', 'Quick basketball tournament', 'basketball', 200, 
  date_trunc('day', now() + interval '1 day') + interval '6 hours', 
  date_trunc('day', now() + interval '1 day') + interval '12 hours', 
  10, 'scheduled', 50, '{"1": 100, "2": 60, "3": 40}'::jsonb),
  
('Evening Challenge', 'Show your keepy uppy skills', 'keepy_uppy', 250, 
  date_trunc('day', now() + interval '1 day') + interval '18 hours', 
  date_trunc('day', now() + interval '2 days'), 
  15, 'scheduled', 50, '{"1": 125, "2": 75, "3": 50}'::jsonb),

('Weekend Warrior', 'Weekend memory challenge', 'memory_match', 500, 
  date_trunc('week', now()) + interval '12 days' + interval '10 hours', 
  date_trunc('week', now()) + interval '13 days' + interval '22 hours', 
  25, 'scheduled', 100, '{"1": 250, "2": 150, "3": 100}'::jsonb),

('Monthly Championship', 'Ultimate monthly competition', 'keepy_uppy', 2000, 
  date_trunc('month', now() + interval '1 month'), 
  date_trunc('month', now() + interval '1 month') + interval '3 days', 
  50, 'scheduled', 200, '{"1": 1000, "2": 600, "3": 400}'::jsonb)
ON CONFLICT DO NOTHING;

GRANT EXECUTE ON FUNCTION get_game_plays_remaining TO authenticated;
GRANT EXECUTE ON FUNCTION play_game TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_earning_cap TO authenticated;