-- Create rewards table
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  image TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  category VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Enable RLS on rewards
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Anyone can view active rewards
CREATE POLICY "Anyone can view active rewards"
ON public.rewards
FOR SELECT
USING (is_active = true);

-- Create redemptions table to track user reward redemptions
CREATE TABLE public.redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
  points_spent INTEGER NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Enable RLS on redemptions
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own redemptions
CREATE POLICY "Users can view own redemptions"
ON public.redemptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own redemptions
CREATE POLICY "Users can insert own redemptions"
ON public.redemptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);