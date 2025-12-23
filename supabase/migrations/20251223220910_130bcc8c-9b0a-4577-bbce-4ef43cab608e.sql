-- Allow users to view basic info of other users for leaderboard
CREATE POLICY "Users can view leaderboard data" ON public.users
  FOR SELECT USING (true);

-- Drop the old restrictive select policy
DROP POLICY IF EXISTS "Users can view own data" ON public.users;