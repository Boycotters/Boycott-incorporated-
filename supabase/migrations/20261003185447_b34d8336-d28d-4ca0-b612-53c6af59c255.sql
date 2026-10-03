
DROP POLICY IF EXISTS "Authenticated can view tournament participants" ON public.tournament_participants;
CREATE POLICY "Users view own tournament entries" ON public.tournament_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view entertainment videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for entertainment videos" ON storage.objects;

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND p.proname NOT IN ('has_role','is_admin','is_business_member','is_business_admin')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;
