-- =============================================
-- USER INVENTORY FOR REDEEMED DIGITAL ITEMS
-- =============================================

-- Create user_inventory table for tracking digital items
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  redemption_id UUID REFERENCES public.redemptions(id),
  item_type VARCHAR NOT NULL, -- 'avatar_frame', 'badge', 'theme', etc.
  is_equipped BOOLEAN DEFAULT false,
  equipped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, reward_id)
);

-- Enable RLS
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_inventory
CREATE POLICY "Users can view own inventory"
  ON public.user_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
  ON public.user_inventory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- AUTO-SCHEDULED TOURNAMENTS
-- =============================================

-- Clear existing sample tournaments
DELETE FROM public.game_tournaments WHERE status = 'scheduled';

-- Create daily tournaments (every day at different times)
INSERT INTO public.game_tournaments (name, description, game_type, start_time, end_time, entry_fee, prize_pool, max_participants, status) VALUES
-- Morning Daily Challenge - Keepy Uppy (9 AM daily)
('Morning Kickoff', 'Start your day with keepy uppy! Top 3 win prizes.', 'keepy_uppy', 
 (CURRENT_DATE + INTERVAL '9 hours')::timestamp with time zone, 
 (CURRENT_DATE + INTERVAL '12 hours')::timestamp with time zone, 
 0, 300, 50, 'scheduled'),

-- Afternoon Rush - Basketball (2 PM daily)
('Afternoon Hoops', 'Shoot some hoops and compete for glory!', 'basketball', 
 (CURRENT_DATE + INTERVAL '14 hours')::timestamp with time zone, 
 (CURRENT_DATE + INTERVAL '17 hours')::timestamp with time zone, 
 0, 300, 50, 'scheduled'),

-- Evening Brain Game - Memory Match (7 PM daily)
('Evening Mind Games', 'Test your memory skills tonight!', 'memory_match', 
 (CURRENT_DATE + INTERVAL '19 hours')::timestamp with time zone, 
 (CURRENT_DATE + INTERVAL '22 hours')::timestamp with time zone, 
 0, 300, 50, 'scheduled'),

-- Weekend Tournaments (larger prizes)
-- Saturday All-Day Keepy Uppy Championship
('Weekend Keepy Uppy Championship', 'The ultimate soccer juggling competition! 1st: 500pts, 2nd: 250pts, 3rd: 100pts', 'keepy_uppy',
 (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '5 days 10 hours')::timestamp with time zone,
 (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '5 days 22 hours')::timestamp with time zone,
 0, 850, 100, 'scheduled'),

-- Sunday Basketball Showdown
('Sunday Hoops Showdown', 'Massive basketball tournament! 1st: 500pts, 2nd: 250pts, 3rd: 100pts', 'basketball',
 (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days 10 hours')::timestamp with time zone,
 (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days 22 hours')::timestamp with time zone,
 0, 850, 100, 'scheduled'),

-- Monthly Grand Tournament (1st of each month)
('Monthly Grand Championship', 'The biggest tournament of the month! All games count. 1st: 1000pts, 2nd: 500pts, 3rd: 250pts', 'keepy_uppy',
 (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month 12 hours')::timestamp with time zone,
 (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month 1 day')::timestamp with time zone,
 0, 1750, 200, 'scheduled');

-- =============================================
-- UPDATE REDEEM_REWARD FUNCTION TO ADD TO INVENTORY
-- =============================================

CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_user_id uuid,
  p_reward_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward RECORD;
  v_wallet RECORD;
  v_redemption_id uuid;
BEGIN
  -- Get reward details
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
  
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Reward not found or inactive');
  END IF;
  
  -- Check stock
  IF v_reward.stock <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Reward out of stock');
  END IF;
  
  -- Get user wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;
  
  IF v_wallet IS NULL OR v_wallet.available_points < v_reward.points_cost THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient points');
  END IF;
  
  -- Deduct points
  UPDATE wallets 
  SET available_points = available_points - v_reward.points_cost
  WHERE user_id = p_user_id;
  
  -- Reduce stock
  UPDATE rewards SET stock = stock - 1 WHERE id = p_reward_id;
  
  -- Create redemption record
  INSERT INTO redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, 'completed')
  RETURNING id INTO v_redemption_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'redemption', -v_reward.points_cost, 'Redeemed: ' || v_reward.name, 'completed');
  
  -- If it's a digital item (badge, frame, theme), add to inventory
  IF v_reward.category IN ('digital', 'badge', 'avatar', 'theme') THEN
    INSERT INTO user_inventory (user_id, reward_id, redemption_id, item_type, is_equipped)
    VALUES (p_user_id, p_reward_id, v_redemption_id, 
      CASE 
        WHEN v_reward.name ILIKE '%frame%' THEN 'avatar_frame'
        WHEN v_reward.name ILIKE '%badge%' THEN 'badge'
        WHEN v_reward.name ILIKE '%theme%' THEN 'theme'
        ELSE 'digital'
      END,
      false
    )
    ON CONFLICT (user_id, reward_id) DO NOTHING;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Reward redeemed successfully!',
    'reward_name', v_reward.name,
    'points_spent', v_reward.points_cost
  );
END;
$$;

-- =============================================
-- FUNCTION TO EQUIP/UNEQUIP INVENTORY ITEMS
-- =============================================

CREATE OR REPLACE FUNCTION public.equip_inventory_item(
  p_user_id uuid,
  p_inventory_id uuid,
  p_equip boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Get the item
  SELECT ui.*, r.name as reward_name, r.category 
  INTO v_item 
  FROM user_inventory ui
  JOIN rewards r ON r.id = ui.reward_id
  WHERE ui.id = p_inventory_id AND ui.user_id = p_user_id;
  
  IF v_item IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Item not found in your inventory');
  END IF;
  
  -- If equipping, unequip other items of same type first
  IF p_equip THEN
    UPDATE user_inventory 
    SET is_equipped = false, equipped_at = NULL
    WHERE user_id = p_user_id AND item_type = v_item.item_type AND id != p_inventory_id;
  END IF;
  
  -- Update the item
  UPDATE user_inventory 
  SET is_equipped = p_equip, equipped_at = CASE WHEN p_equip THEN now() ELSE NULL END
  WHERE id = p_inventory_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', CASE WHEN p_equip THEN 'Item equipped!' ELSE 'Item unequipped' END,
    'item_name', v_item.reward_name
  );
END;
$$;

-- =============================================
-- ADD MORE GAME ACHIEVEMENTS
-- =============================================

INSERT INTO public.game_achievements (name, description, icon, requirement_type, requirement_value, points_reward, game_type, is_active) VALUES
-- Keepy Uppy achievements
('Soccer Star', 'Score 50+ in a single Keepy Uppy game', '⭐', 'single_score', 50, 100, 'keepy_uppy', true),
('Keepy Pro', 'Score 25+ in Keepy Uppy', '🦶', 'single_score', 25, 50, 'keepy_uppy', true),
('First Kicks', 'Play your first Keepy Uppy game', '👶', 'games_played', 1, 10, 'keepy_uppy', true),

-- Basketball achievements  
('Slam Dunk', 'Score 10+ baskets in one Basketball game', '🏆', 'single_score', 10, 100, 'basketball', true),
('Three Pointer', 'Score 5+ in Basketball', '🎯', 'single_score', 5, 50, 'basketball', true),
('Court Debut', 'Play your first Basketball game', '🏀', 'games_played', 1, 10, 'basketball', true),

-- Memory Match achievements
('Perfect Memory', 'Win Memory Match in 12 moves or less', '🧠', 'single_score', 12, 100, 'memory_match', true),
('Quick Thinker', 'Win Memory Match in under 30 seconds', '⚡', 'time_based', 30, 75, 'memory_match', true),
('Memory Starter', 'Play your first Memory Match game', '🎴', 'games_played', 1, 10, 'memory_match', true),

-- Spin Wheel achievements
('Jackpot Winner', 'Hit 100 points on Spin Wheel', '💰', 'single_score', 100, 150, 'spin_wheel', true),
('Lucky Spin', 'Hit 50+ points on Spin Wheel', '🍀', 'single_score', 50, 50, 'spin_wheel', true),
('First Spin', 'Spin the wheel for the first time', '🎡', 'games_played', 1, 10, 'spin_wheel', true),

-- General achievements
('Game Marathon', 'Play 50 total games', '🏃', 'total_games', 50, 200, NULL, true),
('Daily Gamer', 'Play all 4 games in one day', '📅', 'daily_all_games', 4, 100, NULL, true),
('Tournament Victor', 'Win a tournament (1st place)', '👑', 'tournament_win', 1, 300, NULL, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TOURNAMENT PRIZE DISTRIBUTION STRUCTURE
-- =============================================

-- Add prize_distribution column to tournaments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_tournaments' AND column_name = 'prize_distribution'
  ) THEN
    ALTER TABLE public.game_tournaments ADD COLUMN prize_distribution JSONB DEFAULT '{"1": 50, "2": 30, "3": 20}'::jsonb;
  END IF;
END $$;

-- Update existing tournaments with prize distributions
UPDATE public.game_tournaments 
SET prize_distribution = '{"1": 50, "2": 30, "3": 20}'::jsonb
WHERE prize_distribution IS NULL;