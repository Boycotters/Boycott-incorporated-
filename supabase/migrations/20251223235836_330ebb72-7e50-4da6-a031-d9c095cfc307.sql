-- Create streak recovery function
-- Cost: 50 points to recover streak (configurable)
-- Only works if streak was broken within last 24 hours

CREATE OR REPLACE FUNCTION public.recover_streak(p_user_id uuid, p_recovery_cost integer DEFAULT 50)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    last_login DATE;
    curr_streak INTEGER;
    max_streak INTEGER;
    available_pts INTEGER;
    today_date DATE := CURRENT_DATE;
    result JSON;
BEGIN
    -- Get current user data
    SELECT last_login_date, current_streak, longest_streak
    INTO last_login, curr_streak, max_streak
    FROM users 
    WHERE id = p_user_id;
    
    -- Get available points
    SELECT available_points INTO available_pts
    FROM wallets
    WHERE user_id = p_user_id;
    
    -- Check if streak is actually broken (missed yesterday but not more than 1 day)
    IF last_login IS NULL THEN
        result := json_build_object(
            'success', FALSE,
            'error', 'no_streak_to_recover',
            'message', 'You don''t have a streak to recover'
        );
        RETURN result;
    END IF;
    
    -- If already logged in today, no need to recover
    IF last_login = today_date THEN
        result := json_build_object(
            'success', FALSE,
            'error', 'streak_not_broken',
            'message', 'Your streak is not broken'
        );
        RETURN result;
    END IF;
    
    -- If logged in yesterday, streak is still active
    IF last_login = today_date - INTERVAL '1 day' THEN
        result := json_build_object(
            'success', FALSE,
            'error', 'streak_still_active',
            'message', 'Your streak is still active! Claim your daily bonus'
        );
        RETURN result;
    END IF;
    
    -- Streak is broken - check if recoverable (within last 2 days)
    IF last_login < today_date - INTERVAL '2 days' THEN
        result := json_build_object(
            'success', FALSE,
            'error', 'streak_too_old',
            'message', 'Streak can only be recovered within 48 hours of breaking'
        );
        RETURN result;
    END IF;
    
    -- Check if user has enough points
    IF available_pts < p_recovery_cost THEN
        result := json_build_object(
            'success', FALSE,
            'error', 'insufficient_points',
            'message', 'Not enough points. You need ' || p_recovery_cost || ' points',
            'required_points', p_recovery_cost,
            'available_points', available_pts
        );
        RETURN result;
    END IF;
    
    -- Deduct points from wallet
    UPDATE wallets 
    SET available_points = available_points - p_recovery_cost
    WHERE user_id = p_user_id;
    
    -- Update last_login_date to yesterday to maintain streak continuity
    UPDATE users 
    SET last_login_date = today_date - INTERVAL '1 day'
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (p_user_id, 'streak_recovery', -p_recovery_cost, 
            'Streak recovery - saved ' || curr_streak || ' day streak', 'completed');
    
    result := json_build_object(
        'success', TRUE,
        'message', 'Streak recovered! Now claim your daily bonus',
        'recovered_streak', curr_streak,
        'points_spent', p_recovery_cost
    );
    
    RETURN result;
END;
$$;