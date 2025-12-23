-- Add referral_code column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE;

-- Create referrals table to track referral relationships
CREATE TABLE public.referrals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bonus_points INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    UNIQUE(referred_id) -- A user can only be referred once
);

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view referrals they made"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view if they were referred"
ON public.referrals
FOR SELECT
USING (auth.uid() = referred_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_code VARCHAR(10);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character alphanumeric code
        new_code := upper(substr(md5(random()::text), 1, 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = new_code) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    NEW.referral_code := new_code;
    RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral code for new users
CREATE TRIGGER generate_user_referral_code
BEFORE INSERT ON public.users
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION public.generate_referral_code();

-- Update existing users to have referral codes
DO $$
DECLARE
    user_record RECORD;
    new_code VARCHAR(10);
    code_exists BOOLEAN;
BEGIN
    FOR user_record IN SELECT id FROM users WHERE referral_code IS NULL
    LOOP
        LOOP
            new_code := upper(substr(md5(random()::text), 1, 8));
            SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        
        UPDATE users SET referral_code = new_code WHERE id = user_record.id;
    END LOOP;
END;
$$;