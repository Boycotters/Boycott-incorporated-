-- Ensure users.id references auth.users
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_id_fkey,
  ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- Create trigger function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, full_name, total_points, level)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    0,
    1
  );
  
  -- Create wallet for the user
  INSERT INTO public.wallets (user_id, available_points, locked_points)
  VALUES (NEW.id, 0, 0);
  
  RETURN NEW;
END;
$$;

-- Create trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add policy to allow inserts via trigger
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.users;
CREATE POLICY "Allow profile creation on signup"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Add policy to allow wallet creation on signup
DROP POLICY IF EXISTS "Allow wallet creation on signup" ON public.wallets;
CREATE POLICY "Allow wallet creation on signup"
  ON public.wallets
  FOR INSERT
  WITH CHECK (true);