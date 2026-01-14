-- Create table to store phone verification OTPs
CREATE TABLE public.phone_verification_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX idx_phone_otp_phone ON public.phone_verification_otps(phone_number);
CREATE INDEX idx_phone_otp_user ON public.phone_verification_otps(user_id);
CREATE INDEX idx_phone_otp_expires ON public.phone_verification_otps(expires_at);

-- Enable RLS
ALTER TABLE public.phone_verification_otps ENABLE ROW LEVEL SECURITY;

-- Users can only access their own OTPs
CREATE POLICY "Users can view their own OTPs"
  ON public.phone_verification_otps
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Service role only for insert/update/delete (handled via edge function)
CREATE POLICY "Service role can manage OTPs"
  ON public.phone_verification_otps
  FOR ALL
  USING (auth.role() = 'service_role');

-- Clean up expired OTPs automatically (function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.phone_verification_otps
  WHERE expires_at < now() - interval '1 hour';
END;
$$;

-- Fix the sync_email_verification function to have proper search_path
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users
    SET is_verified = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Add phone_verified column to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;
END;
$$;