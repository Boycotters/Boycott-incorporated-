-- Drop all existing verify_admin_access_code functions to fix overload issue
DROP FUNCTION IF EXISTS public.verify_admin_access_code(uuid, text);
DROP FUNCTION IF EXISTS public.verify_admin_access_code(text, uuid);

-- Create a single, properly typed function
CREATE OR REPLACE FUNCTION public.verify_admin_access_code(p_user_id uuid, p_code text)
RETURNS json
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
  
  -- Check if user is already in admin_users
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_user_id) THEN
    -- Grant admin access
    INSERT INTO public.admin_users (user_id, role)
    VALUES (p_user_id, 'admin');
    
    -- Also insert into user_roles for consistency
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'admin')
    ON CONFLICT DO NOTHING;
    
    -- Increment uses count
    UPDATE public.admin_access_codes
    SET uses_count = COALESCE(uses_count, 0) + 1
    WHERE id = v_code_record.id;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Admin access granted');
END;
$$;

-- Replace is_admin function without dropping (since it has dependencies)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = COALESCE(p_user_id, auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = COALESCE(p_user_id, auth.uid()) AND role = 'admin'
  );
$$;

-- Replace update_admin_pin function without dropping
CREATE OR REPLACE FUNCTION public.update_admin_pin(p_old_pin text, p_new_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_hash TEXT;
  v_new_hash TEXT;
  v_code_record RECORD;
BEGIN
  -- Hash the PINs
  v_old_hash := encode(sha256(p_old_pin::bytea), 'hex');
  v_new_hash := encode(sha256(p_new_pin::bytea), 'hex');
  
  -- Find the current active code
  SELECT * INTO v_code_record
  FROM public.admin_access_codes
  WHERE code_hash = v_old_hash
    AND is_active = true;
  
  IF v_code_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Current PIN is incorrect');
  END IF;
  
  -- Update the code
  UPDATE public.admin_access_codes
  SET code_hash = v_new_hash
  WHERE id = v_code_record.id;
  
  RETURN json_build_object('success', true, 'message', 'PIN updated successfully');
END;
$$;