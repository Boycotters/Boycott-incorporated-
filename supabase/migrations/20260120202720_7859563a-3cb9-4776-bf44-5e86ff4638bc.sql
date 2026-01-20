-- Drop the old problematic policy that still exists
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;

-- Recreate the correct policies
DROP POLICY IF EXISTS "Users can view if they are admin" ON public.admin_users;
DROP POLICY IF EXISTS "System can insert admin users" ON public.admin_users;

-- Simple policy - users can see their own admin record
CREATE POLICY "Users can view their admin status"
ON public.admin_users FOR SELECT
USING (auth.uid() = user_id);

-- Allow security definer functions to insert
CREATE POLICY "Allow admin inserts"
ON public.admin_users FOR INSERT
WITH CHECK (true);