-- Allow admins to manage tournaments
CREATE POLICY "Admins can insert tournaments" ON public.game_tournaments
FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update tournaments" ON public.game_tournaments
FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete tournaments" ON public.game_tournaments
FOR DELETE TO authenticated USING (is_admin(auth.uid()));
