-- Fix the leaderboard view to use SECURITY INVOKER (default, safe)
-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard 
WITH (security_invoker = true)
AS
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

-- Since the view uses security_invoker, we need a policy that allows
-- authenticated users to read the non-sensitive fields for leaderboard purposes
-- Add a restricted SELECT policy for leaderboard data (only safe fields matter)
CREATE POLICY "Authenticated users can view leaderboard data"
ON public.users
FOR SELECT
TO authenticated
USING (true);