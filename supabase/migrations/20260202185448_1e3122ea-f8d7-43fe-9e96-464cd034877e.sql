-- Fix RLS policies for admin access to users and withdrawals tables

-- 1. Add policy for admins to view all users
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 2. Add policy for admins to view all withdrawals  
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 3. Add policy for admins to update withdrawals
CREATE POLICY "Admins can update all withdrawals"
ON public.withdrawals
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- 4. Ensure videos table allows admin read of all videos (not just active)
-- Already exists but let's verify by not dropping

-- 5. Add admin ability to delete tasks
CREATE POLICY "Admins can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- 6. Add admin ability to insert tasks
CREATE POLICY "Admins can insert tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- 7. Add admin ability to update tasks
CREATE POLICY "Admins can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- 8. Add admin ability to delete videos
CREATE POLICY "Admins can delete videos"
ON public.videos
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));