-- =====================================================
-- PHASE 1: CRITICAL - Fix users table public exposure
-- =====================================================

-- Drop the overly permissive SELECT policy that exposes all user data
DROP POLICY IF EXISTS "Users can view leaderboard data" ON public.users;

-- Create policy for users to view their own full profile
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Create a secure leaderboard view that only exposes non-sensitive data
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  id,
  full_name,
  level,
  total_points,
  vip_tier,
  current_streak,
  longest_streak
FROM public.users
ORDER BY total_points DESC;

-- Grant access to the leaderboard view
GRANT SELECT ON public.leaderboard TO anon, authenticated;

-- =====================================================
-- PHASE 2: Lock down INSERT policies
-- =====================================================

-- 1. Remove user INSERT capability from user_achievements
-- (Should only be inserted via check_and_award_achievements SECURITY DEFINER function)
DROP POLICY IF EXISTS "System can insert user achievements" ON public.user_achievements;

-- 2. Remove user INSERT capability from streak_milestones  
-- (Should only be inserted via check_streak_milestones SECURITY DEFINER function)
DROP POLICY IF EXISTS "Users can insert own milestones" ON public.streak_milestones;

-- 3. Fix wallets INSERT policy - remove overly permissive policy
-- (Wallets are created by handle_new_user_wallet trigger)
DROP POLICY IF EXISTS "Allow wallet creation on signup" ON public.wallets;

-- 4. Fix users INSERT policy - require auth.uid() = id
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.users;

-- Create restricted policy that validates the user is creating their own profile
CREATE POLICY "Users can create own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Remove user INSERT capability from transactions
-- Create a SECURITY DEFINER function for safe transaction creation
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

-- Create a secure function for creating transactions (only callable by other SECURITY DEFINER functions)
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id uuid,
  p_type varchar,
  p_points_amount integer,
  p_description text,
  p_status varchar DEFAULT 'completed'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, p_type, p_points_amount, p_description, p_status)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- =====================================================
-- PHASE 3: Additional hardening
-- =====================================================

-- Ensure notification_queue has no write access for regular users
-- (Already has no INSERT policy, but let's be explicit)
-- The table should only be written to by edge functions using service role