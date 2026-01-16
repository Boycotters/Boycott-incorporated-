-- Create admin access codes table for secret code access to admin dashboard
CREATE TABLE IF NOT EXISTS public.admin_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_hash TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  uses_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.admin_access_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage access codes
CREATE POLICY "Admins can view access codes"
  ON public.admin_access_codes FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert access codes"
  ON public.admin_access_codes FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update access codes"
  ON public.admin_access_codes FOR UPDATE
  USING (public.is_admin());

-- Create function to verify admin access code and grant admin access
CREATE OR REPLACE FUNCTION public.verify_admin_access_code(p_user_id UUID, p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_hash TEXT;
  v_code_record RECORD;
BEGIN
  -- Hash the provided code
  v_code_hash := encode(sha256(p_code::bytea), 'hex');
  
  -- Find matching active code
  SELECT * INTO v_code_record
  FROM public.admin_access_codes
  WHERE code_hash = v_code_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF v_code_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired access code');
  END IF;
  
  -- Check if user is already an admin
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_user_id) THEN
    RETURN json_build_object('success', true, 'message', 'You already have admin access');
  END IF;
  
  -- Grant admin access
  INSERT INTO public.admin_users (user_id, role)
  VALUES (p_user_id, 'admin');
  
  -- Increment uses count
  UPDATE public.admin_access_codes
  SET uses_count = uses_count + 1
  WHERE id = v_code_record.id;
  
  RETURN json_build_object('success', true, 'message', 'Admin access granted successfully');
END;
$$;

-- Create function to generate admin access code (only for existing admins)
CREATE OR REPLACE FUNCTION public.create_admin_access_code(p_code TEXT, p_expires_days INTEGER DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_hash TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Only admins can create access codes');
  END IF;
  
  -- Code must be 6 digits
  IF NOT (p_code ~ '^\d{6}$') THEN
    RETURN json_build_object('success', false, 'message', 'Code must be exactly 6 digits');
  END IF;
  
  -- Hash the code
  v_code_hash := encode(sha256(p_code::bytea), 'hex');
  
  -- Check if code already exists
  IF EXISTS (SELECT 1 FROM public.admin_access_codes WHERE code_hash = v_code_hash AND is_active = true) THEN
    RETURN json_build_object('success', false, 'message', 'This code already exists');
  END IF;
  
  -- Calculate expiration
  IF p_expires_days IS NOT NULL THEN
    v_expires_at := now() + (p_expires_days || ' days')::interval;
  END IF;
  
  -- Insert the code
  INSERT INTO public.admin_access_codes (code_hash, created_by, expires_at)
  VALUES (v_code_hash, auth.uid(), v_expires_at);
  
  RETURN json_build_object('success', true, 'message', 'Access code created successfully');
END;
$$;

-- Insert a default access code for the existing admin (code: 123456) 
-- This should be changed immediately after first use
INSERT INTO public.admin_access_codes (code_hash, is_active)
VALUES (encode(sha256('123456'::bytea), 'hex'), true);

-- Fix security issues: Hash OTPs instead of storing plain text
-- Add hash column to phone_verification_otps
ALTER TABLE public.phone_verification_otps 
ADD COLUMN IF NOT EXISTS otp_hash TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_phone_verification_otps_phone_hash 
ON public.phone_verification_otps(phone_number, otp_hash);

-- Fix: Make earning_algorithms only visible to authenticated users
DROP POLICY IF EXISTS "Anyone can view earning algorithms" ON public.earning_algorithms;
CREATE POLICY "Authenticated users can view earning algorithms"
  ON public.earning_algorithms FOR SELECT
  TO authenticated
  USING (true);

-- Tighten admin_activity_logs - admins can only view their own logs
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.admin_activity_logs;
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.admin_activity_logs;

CREATE POLICY "Admins can insert their own activity logs"
  ON public.admin_activity_logs FOR INSERT
  WITH CHECK (public.is_admin() AND admin_user_id = auth.uid());

CREATE POLICY "Admins can view their own activity logs"
  ON public.admin_activity_logs FOR SELECT
  USING (public.is_admin() AND admin_user_id = auth.uid());