-- Drop and recreate functions that have signature conflicts
DROP FUNCTION IF EXISTS public.equip_inventory_item(uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.redeem_reward(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_withdrawal_eligibility(uuid);
DROP FUNCTION IF EXISTS public.are_tasks_available_today();
DROP FUNCTION IF EXISTS public.get_active_flash_sales();

-- 5. Fix the equip_inventory_item function to properly unequip items
CREATE OR REPLACE FUNCTION public.equip_inventory_item(
  p_user_id UUID,
  p_inventory_id UUID,
  p_equip BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_item_type TEXT;
BEGIN
  -- Get the item and check ownership
  SELECT ui.*, r.name as reward_name, r.category
  INTO v_item
  FROM user_inventory ui
  JOIN rewards r ON r.id = ui.reward_id
  WHERE ui.id = p_inventory_id AND ui.user_id = p_user_id;
  
  IF v_item IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Item not found in your inventory');
  END IF;
  
  -- Check if item is expired
  IF v_item.expires_at IS NOT NULL AND v_item.expires_at < now() THEN
    UPDATE user_inventory SET is_expired = true WHERE id = p_inventory_id;
    RETURN json_build_object('success', false, 'message', 'This item has expired');
  END IF;
  
  v_item_type := v_item.item_type;
  
  IF p_equip THEN
    -- Unequip any currently equipped item of the same type
    UPDATE user_inventory
    SET is_equipped = false, equipped_at = NULL
    WHERE user_id = p_user_id 
      AND item_type = v_item_type 
      AND is_equipped = true
      AND id != p_inventory_id;
    
    -- Equip the new item
    UPDATE user_inventory
    SET is_equipped = true, equipped_at = now()
    WHERE id = p_inventory_id;
    
    RETURN json_build_object(
      'success', true, 
      'message', v_item.reward_name || ' equipped successfully',
      'item_name', v_item.reward_name
    );
  ELSE
    -- Unequip the item
    UPDATE user_inventory
    SET is_equipped = false, equipped_at = NULL
    WHERE id = p_inventory_id;
    
    RETURN json_build_object(
      'success', true, 
      'message', v_item.reward_name || ' removed successfully',
      'item_name', v_item.reward_name
    );
  END IF;
END;
$$;

-- 6. Update redeem_reward to set expiry and proper item_type
CREATE OR REPLACE FUNCTION public.redeem_reward(p_user_id UUID, p_reward_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward RECORD;
  v_wallet RECORD;
  v_redemption_id UUID;
  v_item_type TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get reward details
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
  
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Reward not found or inactive');
  END IF;
  
  -- Check stock
  IF v_reward.stock <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'This reward is out of stock');
  END IF;
  
  -- Get user wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
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
  
  -- Determine item type based on reward name/category
  IF v_reward.name ILIKE '%frame%' THEN
    v_item_type := 'avatar_frame';
  ELSIF v_reward.name ILIKE '%badge%' THEN
    v_item_type := 'badge';
  ELSIF v_reward.name ILIKE '%theme%' THEN
    v_item_type := 'theme';
  ELSE
    v_item_type := 'item';
  END IF;
  
  -- Set expiry (30 days for digital items)
  IF v_reward.category = 'digital' THEN
    v_expires_at := now() + interval '30 days';
  ELSE
    v_expires_at := NULL;
  END IF;
  
  -- Add to user inventory for digital items
  IF v_reward.category = 'digital' THEN
    INSERT INTO user_inventory (user_id, reward_id, item_type, redemption_id, expires_at)
    VALUES (p_user_id, p_reward_id, v_item_type, v_redemption_id, v_expires_at);
  END IF;
  
  -- Record transaction
  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'redemption', -v_reward.points_cost, 'Redeemed: ' || v_reward.name, 'completed');
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Reward redeemed successfully!',
    'reward_name', v_reward.name,
    'points_spent', v_reward.points_cost,
    'expires_at', v_expires_at
  );
END;
$$;

-- 7. Update check_withdrawal_eligibility to ONLY check referrals, not email
CREATE OR REPLACE FUNCTION public.check_withdrawal_eligibility(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_count INTEGER;
  v_required_referrals INTEGER := 3;
  v_has_withdrawn BOOLEAN;
BEGIN
  -- Check if user has ever withdrawn before
  SELECT EXISTS(SELECT 1 FROM withdrawals WHERE user_id = p_user_id AND status IN ('completed', 'pending', 'processing'))
  INTO v_has_withdrawn;
  
  -- If user has already withdrawn before, they are eligible
  IF v_has_withdrawn THEN
    RETURN json_build_object(
      'eligible', true,
      'message', 'You are eligible to withdraw'
    );
  END IF;
  
  -- Count successful referrals for first-time withdrawers
  SELECT COUNT(*)
  INTO v_referral_count
  FROM referrals
  WHERE referrer_id = p_user_id AND status = 'completed';
  
  -- Check if enough referrals for first withdrawal
  IF v_referral_count < v_required_referrals THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'insufficient_referrals',
      'message', 'First withdrawal requires ' || v_required_referrals || ' referrals. You have ' || v_referral_count || '.',
      'referral_count', v_referral_count,
      'required_referrals', v_required_referrals,
      'remaining_referrals', v_required_referrals - v_referral_count
    );
  END IF;
  
  RETURN json_build_object(
    'eligible', true,
    'message', 'You are eligible to withdraw',
    'referral_count', v_referral_count
  );
END;
$$;

-- 8. Add flash_sales table for proper flash sale management
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reward_id UUID REFERENCES public.rewards(id),
  discount_percentage INTEGER NOT NULL DEFAULT 20,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on flash_sales
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Anyone can view active flash sales" ON public.flash_sales;

-- Policy for viewing flash sales
CREATE POLICY "Anyone can view active flash sales" ON public.flash_sales
FOR SELECT USING (is_active = true AND starts_at <= now() AND ends_at > now());

-- 9. Create function to check if flash sales should show (weekday only, random days)
CREATE OR REPLACE FUNCTION public.get_active_flash_sales()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_weekend BOOLEAN;
  v_show_flash_sales BOOLEAN;
  v_sales JSON;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lusaka');
  v_is_weekend := v_day_of_week IN (0, 6);
  
  -- Do not show flash sales on weekends
  IF v_is_weekend THEN
    RETURN json_build_object('show', false, 'reason', 'weekend');
  END IF;
  
  -- Show flash sales randomly on ~40% of weekdays (based on current date hash)
  v_show_flash_sales := (EXTRACT(DAY FROM CURRENT_DATE)::INTEGER % 5) IN (0, 1);
  
  IF NOT v_show_flash_sales THEN
    RETURN json_build_object('show', false, 'reason', 'not_flash_day');
  END IF;
  
  -- Get active flash sales
  SELECT json_agg(row_to_json(fs.*))
  INTO v_sales
  FROM (
    SELECT fs.*, r.name, r.image, r.points_cost, r.description
    FROM flash_sales fs
    JOIN rewards r ON r.id = fs.reward_id
    WHERE fs.is_active = true 
      AND fs.starts_at <= now() 
      AND fs.ends_at > now()
    LIMIT 3
  ) fs;
  
  RETURN json_build_object('show', true, 'sales', COALESCE(v_sales, '[]'::json));
END;
$$;

-- 10. Update are_tasks_available_today to be more comprehensive
CREATE OR REPLACE FUNCTION public.are_tasks_available_today()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_weekend BOOLEAN;
  v_active_campaign RECORD;
BEGIN
  -- Get current day of week in Zambian timezone (CAT)
  v_day_of_week := EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lusaka');
  v_is_weekend := v_day_of_week IN (0, 6);
  
  -- Check for active weekend campaign
  SELECT * INTO v_active_campaign
  FROM weekend_campaigns
  WHERE is_active = true
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE;
  
  IF v_is_weekend THEN
    IF v_active_campaign IS NOT NULL THEN
      RETURN json_build_object(
        'available', true,
        'is_weekend', true,
        'has_campaign', true,
        'campaign_name', v_active_campaign.name,
        'bonus_multiplier', v_active_campaign.bonus_multiplier,
        'message', 'Weekend campaign active! ' || v_active_campaign.name
      );
    ELSE
      RETURN json_build_object(
        'available', false,
        'is_weekend', true,
        'has_campaign', false,
        'message', 'Tasks are locked on weekends. Come back Monday!'
      );
    END IF;
  END IF;
  
  RETURN json_build_object(
    'available', true,
    'is_weekend', false,
    'has_campaign', v_active_campaign IS NOT NULL,
    'campaign_name', CASE WHEN v_active_campaign IS NOT NULL THEN v_active_campaign.name ELSE NULL END,
    'bonus_multiplier', CASE WHEN v_active_campaign IS NOT NULL THEN v_active_campaign.bonus_multiplier ELSE 1 END,
    'message', 'Tasks are available today!'
  );
END;
$$;