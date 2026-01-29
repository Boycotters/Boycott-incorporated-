-- Recreate the handle_new_user function with optimized performance
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code VARCHAR(10);
BEGIN
  -- Generate simple referral code (fast, no loop needed)
  new_code := upper(substr(md5(NEW.id::text || extract(epoch from now())::text), 1, 8));

  -- Insert into users table with referral code (use ON CONFLICT to handle duplicates)
  INSERT INTO public.users (id, email, full_name, total_points, level, referral_code, vip_tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    0,
    1,
    new_code,
    'bronze'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name);
  
  -- Create wallet for the user (use ON CONFLICT to handle duplicates)
  INSERT INTO public.wallets (user_id, available_points, locked_points)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists (in case it's misconfigured)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();