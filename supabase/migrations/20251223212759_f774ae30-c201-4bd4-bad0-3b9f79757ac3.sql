-- Function to process referral and award bonus points
CREATE OR REPLACE FUNCTION public.process_referral(
    referrer_code VARCHAR,
    new_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    referrer_user_id UUID;
    bonus_points INTEGER := 100;
BEGIN
    -- Find the referrer by their referral code
    SELECT id INTO referrer_user_id
    FROM users
    WHERE referral_code = referrer_code;
    
    -- If no referrer found, return false
    IF referrer_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Make sure user isn't referring themselves
    IF referrer_user_id = new_user_id THEN
        RETURN FALSE;
    END IF;
    
    -- Check if this user was already referred
    IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = new_user_id) THEN
        RETURN FALSE;
    END IF;
    
    -- Create the referral record
    INSERT INTO referrals (referrer_id, referred_id, bonus_points, status)
    VALUES (referrer_user_id, new_user_id, bonus_points, 'completed');
    
    -- Award bonus points to the referrer's wallet
    UPDATE wallets 
    SET available_points = available_points + bonus_points
    WHERE user_id = referrer_user_id;
    
    -- Update referrer's total points
    UPDATE users 
    SET total_points = total_points + bonus_points
    WHERE id = referrer_user_id;
    
    -- Add transaction record for the referrer
    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (referrer_user_id, 'referral_bonus', bonus_points, 'Referral bonus for inviting a friend', 'completed');
    
    RETURN TRUE;
END;
$$;