-- Fix Admin Access: Create proper user_roles table and update verify_admin_access_code function

-- Create app_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update verify_admin_access_code to use user_roles table
CREATE OR REPLACE FUNCTION public.verify_admin_access_code(p_code TEXT, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_code_hash TEXT;
BEGIN
  -- Generate hash of the provided code
  v_code_hash := encode(sha256(p_code::bytea), 'hex');
  
  -- Check if code exists and is valid
  SELECT * INTO v_code_record
  FROM public.admin_access_codes
  WHERE code_hash = v_code_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired access code');
  END IF;
  
  -- Check if user already has admin role
  IF public.has_role(p_user_id, 'admin') THEN
    RETURN json_build_object('success', true, 'message', 'Already an admin');
  END IF;
  
  -- Insert into user_roles (not admin_users)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update uses count
  UPDATE public.admin_access_codes
  SET uses_count = COALESCE(uses_count, 0) + 1
  WHERE id = v_code_record.id;
  
  RETURN json_build_object('success', true, 'message', 'Admin access granted');
END;
$$;

-- Update is_admin function to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(COALESCE(p_user_id, auth.uid()), 'admin')
$$;

-- Migrate existing admin_users to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.admin_users
ON CONFLICT (user_id, role) DO NOTHING;

-- Create default admin access code if none exists
INSERT INTO public.admin_access_codes (code_hash, is_active, expires_at)
SELECT encode(sha256('123456'::bytea), 'hex'), true, now() + interval '1 year'
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_access_codes WHERE is_active = true
);

-- Update all videos to 10 points
UPDATE public.videos SET points_reward = 10 WHERE is_active = true;

-- Update task points to meet 180 daily cap goal
-- Structure: 3 surveys × 20 = 60, 4 videos × 10 = 40, 4 games × 10 = 40, 2 digital × 20 = 40
-- Total = 180 points

-- Reset ALL task points to reasonable values
UPDATE public.tasks SET points_reward = 
  CASE 
    WHEN category = 'survey' THEN 20
    WHEN category = 'video_ad' THEN 10
    WHEN category = 'learning' THEN 15
    WHEN category = 'gaming' THEN 10
    WHEN category = 'quick' THEN 5
    WHEN category = 'social' THEN 10
    WHEN category = 'app_install' THEN 15
    WHEN category = 'shopping' THEN 10
    WHEN category = 'lifestyle' THEN 10
    WHEN category = 'challenge' THEN 25
    ELSE 10
  END
WHERE is_active = true;

-- Fix equip_inventory_item function to properly toggle items
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
  -- Get the inventory item
  SELECT ui.*, r.name as reward_name
  INTO v_item
  FROM public.user_inventory ui
  JOIN public.rewards r ON r.id = ui.reward_id
  WHERE ui.id = p_inventory_id AND ui.user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Item not found in inventory');
  END IF;
  
  v_item_type := v_item.item_type;
  
  IF p_equip THEN
    -- Unequip any other item of the same type first
    UPDATE public.user_inventory
    SET is_equipped = false, equipped_at = NULL
    WHERE user_id = p_user_id 
      AND item_type = v_item_type 
      AND id != p_inventory_id
      AND is_equipped = true;
    
    -- Equip this item
    UPDATE public.user_inventory
    SET is_equipped = true, equipped_at = now()
    WHERE id = p_inventory_id AND user_id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'message', v_item.reward_name || ' equipped!',
      'item_name', v_item.reward_name
    );
  ELSE
    -- Unequip the item
    UPDATE public.user_inventory
    SET is_equipped = false, equipped_at = NULL
    WHERE id = p_inventory_id AND user_id = p_user_id;
    
    RETURN json_build_object(
      'success', true, 
      'message', v_item.reward_name || ' removed!',
      'item_name', v_item.reward_name
    );
  END IF;
END;
$$;