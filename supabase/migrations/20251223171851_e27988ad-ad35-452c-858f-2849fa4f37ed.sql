-- Add SELECT policy for transactions table
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add INSERT policy for transactions table
CREATE POLICY "Users can insert own transactions"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for wallets table
CREATE POLICY "Users can update own wallet"
ON wallets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for redemptions table
CREATE POLICY "Users can update own redemptions"
ON redemptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy for users table
CREATE POLICY "Users can delete own account"
ON users FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Fix function search path for update_user_points
ALTER FUNCTION update_user_points(uuid, integer) SET search_path = public;