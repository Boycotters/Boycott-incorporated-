-- Fix admin access check: The verify function inserts into user_roles but the check uses admin_users
-- We need to update is_admin to check user_roles OR admin_users

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check both user_roles and admin_users tables for backwards compatibility
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = p_user_id
  );
END;
$$;

-- Also update verify_admin_access_code to insert into admin_users for consistency
CREATE OR REPLACE FUNCTION public.verify_admin_access_code(p_code TEXT, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_code_hash TEXT;
BEGIN
  -- Generate hash of the provided code
  v_code_hash := encode(sha256(p_code::bytea), 'hex');
  
  -- Check if code exists and is valid
  SELECT * INTO v_code_record
  FROM public.admin_access_codes
  WHERE code_hash = v_code_hash
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired PIN');
  END IF;
  
  -- Check if user already has admin access
  IF public.is_admin(p_user_id) THEN
    RETURN json_build_object('success', true, 'message', 'Access granted');
  END IF;
  
  -- Insert into admin_users table (for consistency with the check)
  INSERT INTO public.admin_users (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT DO NOTHING;
  
  -- Also insert into user_roles for the new system
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT DO NOTHING;
  
  -- Update uses count
  UPDATE public.admin_access_codes
  SET uses_count = COALESCE(uses_count, 0) + 1
  WHERE id = v_code_record.id;
  
  RETURN json_build_object('success', true, 'message', 'Admin access granted');
END;
$$;

-- Function to update admin PIN
CREATE OR REPLACE FUNCTION public.update_admin_pin(p_old_pin TEXT, p_new_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_hash TEXT;
  v_new_hash TEXT;
  v_updated INTEGER;
BEGIN
  -- Check caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  
  -- Validate new PIN
  IF length(p_new_pin) != 6 OR p_new_pin !~ '^[0-9]+$' THEN
    RETURN json_build_object('success', false, 'message', 'PIN must be exactly 6 digits');
  END IF;
  
  v_old_hash := encode(sha256(p_old_pin::bytea), 'hex');
  v_new_hash := encode(sha256(p_new_pin::bytea), 'hex');
  
  -- Verify old PIN exists
  IF NOT EXISTS (SELECT 1 FROM public.admin_access_codes WHERE code_hash = v_old_hash AND is_active = true) THEN
    RETURN json_build_object('success', false, 'message', 'Current PIN is incorrect');
  END IF;
  
  -- Update the PIN
  UPDATE public.admin_access_codes
  SET code_hash = v_new_hash
  WHERE code_hash = v_old_hash AND is_active = true;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  IF v_updated > 0 THEN
    RETURN json_build_object('success', true, 'message', 'PIN updated successfully');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Failed to update PIN');
  END IF;
END;
$$;