-- Fix overly permissive RLS policy on admin_users
DROP POLICY IF EXISTS "Allow admin inserts" ON public.admin_users;

-- Create proper admin-only insert policy
CREATE POLICY "Only admins can insert admin_users"
ON public.admin_users
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);