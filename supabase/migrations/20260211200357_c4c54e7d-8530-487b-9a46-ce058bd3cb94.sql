
-- Create a secure admin function to verify user phones
CREATE OR REPLACE FUNCTION public.admin_verify_phone(p_user_id uuid, p_verified boolean DEFAULT true)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  UPDATE users
  SET phone_verified = p_verified
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 
    CASE WHEN p_verified THEN 'Phone verified successfully' ELSE 'Phone verification removed' END
  );
END;
$$;
