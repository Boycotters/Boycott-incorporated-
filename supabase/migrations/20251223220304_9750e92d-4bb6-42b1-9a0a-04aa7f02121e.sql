-- Create VIP tiers table
CREATE TABLE public.vip_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  min_points integer NOT NULL DEFAULT 0,
  multiplier numeric(3,2) NOT NULL DEFAULT 1.00,
  icon character varying NOT NULL,
  color character varying NOT NULL,
  benefits text[] NOT NULL DEFAULT '{}',
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;

-- Anyone can view tiers
CREATE POLICY "Anyone can view VIP tiers" ON public.vip_tiers
  FOR SELECT USING (true);

-- Insert the four VIP tiers
INSERT INTO public.vip_tiers (name, slug, min_points, multiplier, icon, color, benefits) VALUES
('Bronze', 'bronze', 0, 1.00, '🥉', '#CD7F32', ARRAY['Access to basic rewards', 'Daily login bonus', 'Standard task rewards']),
('Silver', 'silver', 1000, 1.25, '🥈', '#C0C0C0', ARRAY['25% bonus on all points', 'Early access to new tasks', 'Exclusive silver rewards', 'Priority support']),
('Gold', 'gold', 5000, 1.50, '🥇', '#FFD700', ARRAY['50% bonus on all points', 'Exclusive gold rewards', 'Double streak bonuses', 'VIP-only challenges', 'Monthly bonus rewards']),
('Diamond', 'diamond', 15000, 2.00, '💎', '#B9F2FF', ARRAY['100% bonus on all points', 'Exclusive diamond rewards', 'Triple streak bonuses', 'First access to new features', 'Personal reward requests', 'Diamond-only mega tasks']);

-- Add vip_tier column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vip_tier character varying DEFAULT 'bronze';

-- Create function to get user's VIP tier based on total points
CREATE OR REPLACE FUNCTION public.get_user_vip_tier(p_total_points integer)
RETURNS character varying
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  tier_slug character varying;
BEGIN
  SELECT slug INTO tier_slug
  FROM vip_tiers
  WHERE min_points <= p_total_points
  ORDER BY min_points DESC
  LIMIT 1;
  
  RETURN COALESCE(tier_slug, 'bronze');
END;
$$;

-- Create function to update user's VIP tier
CREATE OR REPLACE FUNCTION public.update_user_vip_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.vip_tier := get_user_vip_tier(NEW.total_points);
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update VIP tier when points change
CREATE TRIGGER update_vip_tier_on_points_change
  BEFORE UPDATE OF total_points ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_vip_tier();

-- Update existing users' VIP tiers
UPDATE public.users SET vip_tier = get_user_vip_tier(total_points);

-- Update the update_user_points function to apply VIP multiplier
CREATE OR REPLACE FUNCTION public.update_user_points(user_id uuid, points_to_add integer)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  user_tier character varying;
  tier_multiplier numeric(3,2);
  final_points integer;
BEGIN
  -- Get user's current VIP tier
  SELECT vip_tier INTO user_tier FROM users WHERE id = update_user_points.user_id;
  
  -- Get multiplier for that tier
  SELECT multiplier INTO tier_multiplier FROM vip_tiers WHERE slug = user_tier;
  tier_multiplier := COALESCE(tier_multiplier, 1.00);
  
  -- Calculate final points with multiplier
  final_points := ROUND(points_to_add * tier_multiplier);
  
  -- Update wallet
  UPDATE wallets 
  SET available_points = available_points + final_points
  WHERE wallets.user_id = update_user_points.user_id;
  
  -- Update users table
  UPDATE users 
  SET total_points = total_points + final_points
  WHERE id = update_user_points.user_id;
  
  -- Add transaction record with multiplier info
  INSERT INTO transactions (user_id, type, points_amount, description)
  VALUES (user_id, 'earn', final_points, 
    CASE WHEN tier_multiplier > 1 
      THEN 'Task reward (' || ROUND((tier_multiplier - 1) * 100) || '% VIP bonus applied)'
      ELSE 'Task completion reward'
    END);
END;
$$;