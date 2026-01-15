-- Fix 1: Remove the dangerous OTP exposure policy that allows viewing OTPs where user_id IS NULL
DROP POLICY IF EXISTS "Users can view their own OTPs" ON phone_verification_otps;

-- Create a more secure policy - users can only view OTPs for their own user_id (not NULL ones)
CREATE POLICY "Users can view their own OTPs" 
ON phone_verification_otps 
FOR SELECT 
USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Fix 2: Create a secure leaderboard view that only exposes public fields
-- First drop if exists
DROP VIEW IF EXISTS public.leaderboard;

-- Create secure leaderboard view with only public data
CREATE VIEW public.leaderboard 
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  total_points,
  level,
  vip_tier,
  current_streak,
  longest_streak
FROM public.users
WHERE total_points IS NOT NULL
ORDER BY total_points DESC;

-- Fix 3: Update the users table SELECT policy to be more restrictive
-- Remove the overly permissive "Authenticated users can view leaderboard data" policy
DROP POLICY IF EXISTS "Authenticated users can view leaderboard data" ON users;

-- Keep only the policy that lets users view their own profile
-- The existing "Users can view own profile" policy already exists with USING (auth.uid() = id)

-- Fix 4: Fix the permissive INSERT policy on ai_usage_logs (currently uses "true")
DROP POLICY IF EXISTS "System can insert AI usage logs" ON ai_usage_logs;

-- Create a more restrictive policy - authenticated users can insert their own logs
CREATE POLICY "Users can insert AI usage logs" 
ON ai_usage_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix 5: Add missing UPDATE policy for notification_queue so users can mark as read
CREATE POLICY "Users can update own notifications" 
ON notification_queue 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Fix 6: Ensure leaderboard view is accessible
GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.leaderboard TO anon;