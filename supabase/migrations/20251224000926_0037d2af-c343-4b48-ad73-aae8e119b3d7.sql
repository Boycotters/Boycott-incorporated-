-- Add daily_task_bonus to vip_tiers
ALTER TABLE public.vip_tiers 
ADD COLUMN IF NOT EXISTS daily_task_bonus integer NOT NULL DEFAULT 0;

-- Add upgrade_cost column (points needed to manually upgrade to this tier)
ALTER TABLE public.vip_tiers 
ADD COLUMN IF NOT EXISTS upgrade_cost integer NOT NULL DEFAULT 0;

-- Update tiers with daily task bonuses and upgrade costs
UPDATE public.vip_tiers SET daily_task_bonus = 0, upgrade_cost = 0 WHERE slug = 'bronze';
UPDATE public.vip_tiers SET daily_task_bonus = 2, upgrade_cost = 200 WHERE slug = 'silver';
UPDATE public.vip_tiers SET daily_task_bonus = 4, upgrade_cost = 500 WHERE slug = 'gold';
UPDATE public.vip_tiers SET daily_task_bonus = 6, upgrade_cost = 1000 WHERE slug = 'diamond';
UPDATE public.vip_tiers SET daily_task_bonus = 6, upgrade_cost = 1000 WHERE slug = 'platinum';

-- Create function to purchase tier upgrade
CREATE OR REPLACE FUNCTION public.purchase_tier_upgrade(p_user_id uuid, p_target_tier varchar)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_tier varchar;
    target_tier_data RECORD;
    current_tier_data RECORD;
    available_pts integer;
    result json;
BEGIN
    -- Get user's current tier
    SELECT vip_tier INTO current_tier FROM users WHERE id = p_user_id;
    
    -- Get target tier data
    SELECT * INTO target_tier_data FROM vip_tiers WHERE slug = p_target_tier;
    
    IF target_tier_data IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'invalid_tier', 'message', 'Invalid tier selected');
    END IF;
    
    -- Get current tier data
    SELECT * INTO current_tier_data FROM vip_tiers WHERE slug = current_tier;
    
    -- Check if already at or above target tier
    IF current_tier_data.min_points >= target_tier_data.min_points THEN
        RETURN json_build_object('success', false, 'error', 'already_at_tier', 'message', 'You are already at this tier or higher');
    END IF;
    
    -- Get available points
    SELECT available_points INTO available_pts FROM wallets WHERE user_id = p_user_id;
    
    -- Check if user has enough points
    IF available_pts < target_tier_data.upgrade_cost THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'insufficient_points', 
            'message', 'Not enough points. You need ' || target_tier_data.upgrade_cost || ' points',
            'required', target_tier_data.upgrade_cost,
            'available', available_pts
        );
    END IF;
    
    -- Deduct points
    UPDATE wallets SET available_points = available_points - target_tier_data.upgrade_cost WHERE user_id = p_user_id;
    
    -- Update user's tier
    UPDATE users SET vip_tier = p_target_tier WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (p_user_id, 'tier_upgrade', -target_tier_data.upgrade_cost, 
            'Upgraded to ' || target_tier_data.name || ' tier', 'completed');
    
    RETURN json_build_object(
        'success', true,
        'message', 'Welcome to ' || target_tier_data.name || ' tier!',
        'new_tier', p_target_tier,
        'points_spent', target_tier_data.upgrade_cost,
        'daily_task_bonus', target_tier_data.daily_task_bonus
    );
END;
$$;