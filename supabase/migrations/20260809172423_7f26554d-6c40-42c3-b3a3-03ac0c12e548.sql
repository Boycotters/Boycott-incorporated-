ALTER TABLE public.kyc_verifications
  ADD COLUMN IF NOT EXISTS id_type text NOT NULL DEFAULT 'nrc',
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_id_number text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text;