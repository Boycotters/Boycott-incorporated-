
-- Add RLS policies for admin rewards management
CREATE POLICY "Admins can insert rewards"
  ON public.rewards FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update rewards"
  ON public.rewards FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete rewards"
  ON public.rewards FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
