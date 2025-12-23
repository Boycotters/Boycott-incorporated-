-- Add streak tracking columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login_date DATE,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- Add streak achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points_reward) VALUES
('First Day', 'Log in for your first day', '📅', 'streak', 'streak_days', 1, 5),
('Week Warrior', 'Maintain a 7-day login streak', '🔥', 'streak', 'streak_days', 7, 50),
('Fortnight Fighter', 'Maintain a 14-day login streak', '💫', 'streak', 'streak_days', 14, 100),
('Monthly Master', 'Maintain a 30-day login streak', '🌟', 'streak', 'streak_days', 30, 250),
('Dedication King', 'Maintain a 60-day login streak', '👑', 'streak', 'streak_days', 60, 500);

-- Function to check and update login streak
CREATE OR REPLACE FUNCTION public.check_login_streak(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    last_login DATE;
    curr_streak INTEGER;
    max_streak INTEGER;
    today_date DATE := CURRENT_DATE;
    bonus_points INTEGER := 0;
    streak_updated BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Get current user streak data
    SELECT last_login_date, current_streak, longest_streak 
    INTO last_login, curr_streak, max_streak
    FROM users 
    WHERE id = p_user_id;
    
    -- Initialize if null
    IF curr_streak IS NULL THEN curr_streak := 0; END IF;
    IF max_streak IS NULL THEN max_streak := 0; END IF;
    
    -- Check if already logged in today
    IF last_login = today_date THEN
        -- Already claimed today
        result := json_build_object(
            'claimed', FALSE,
            'already_claimed_today', TRUE,
            'current_streak', curr_streak,
            'longest_streak', max_streak,
            'bonus_points', 0
        );
        RETURN result;
    END IF;
    
    -- Check streak logic
    IF last_login = today_date - INTERVAL '1 day' THEN
        -- Consecutive day - increase streak
        curr_streak := curr_streak + 1;
    ELSIF last_login IS NULL OR last_login < today_date - INTERVAL '1 day' THEN
        -- Streak broken or first login - reset to 1
        curr_streak := 1;
    END IF;
    
    -- Update longest streak if needed
    IF curr_streak > max_streak THEN
        max_streak := curr_streak;
    END IF;
    
    -- Calculate bonus points based on streak (increases every 7 days)
    bonus_points := 5 + (LEAST(curr_streak, 30) / 7) * 5;
    
    -- Update user record
    UPDATE users 
    SET last_login_date = today_date,
        current_streak = curr_streak,
        longest_streak = max_streak
    WHERE id = p_user_id;
    
    -- Award bonus points
    UPDATE wallets 
    SET available_points = available_points + bonus_points
    WHERE user_id = p_user_id;
    
    UPDATE users 
    SET total_points = total_points + bonus_points
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, type, points_amount, description, status)
    VALUES (p_user_id, 'daily_bonus', bonus_points, 
            'Day ' || curr_streak || ' login streak bonus', 'completed');
    
    result := json_build_object(
        'claimed', TRUE,
        'already_claimed_today', FALSE,
        'current_streak', curr_streak,
        'longest_streak', max_streak,
        'bonus_points', bonus_points
    );
    
    RETURN result;
END;
$$;

-- Update check_and_award_achievements to include streak achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tasks_count INTEGER;
    total_pts INTEGER;
    referrals_count INTEGER;
    user_level INTEGER;
    user_streak INTEGER;
    achievement_record RECORD;
    awarded_count INTEGER := 0;
BEGIN
    -- Get user stats
    SELECT COUNT(*) INTO tasks_count 
    FROM user_tasks 
    WHERE user_id = p_user_id AND status = 'completed';
    
    SELECT COALESCE(total_points, 0), COALESCE(level, 1), COALESCE(current_streak, 0)
    INTO total_pts, user_level, user_streak
    FROM users 
    WHERE id = p_user_id;
    
    SELECT COUNT(*) INTO referrals_count 
    FROM referrals 
    WHERE referrer_id = p_user_id;
    
    -- Check each achievement
    FOR achievement_record IN 
        SELECT * FROM achievements WHERE is_active = true
    LOOP
        -- Skip if already earned
        IF EXISTS (
            SELECT 1 FROM user_achievements 
            WHERE user_id = p_user_id AND achievement_id = achievement_record.id
        ) THEN
            CONTINUE;
        END IF;
        
        -- Check if requirement is met
        IF (achievement_record.requirement_type = 'tasks_completed' AND tasks_count >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'points_earned' AND total_pts >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'referrals_made' AND referrals_count >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'level_reached' AND user_level >= achievement_record.requirement_value) OR
           (achievement_record.requirement_type = 'streak_days' AND user_streak >= achievement_record.requirement_value)
        THEN
            -- Award the achievement
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (p_user_id, achievement_record.id);
            
            -- Award bonus points if any
            IF achievement_record.points_reward > 0 THEN
                UPDATE wallets 
                SET available_points = available_points + achievement_record.points_reward
                WHERE wallets.user_id = p_user_id;
                
                UPDATE users 
                SET total_points = total_points + achievement_record.points_reward
                WHERE id = p_user_id;
                
                INSERT INTO transactions (user_id, type, points_amount, description, status)
                VALUES (p_user_id, 'achievement', achievement_record.points_reward, 
                        'Achievement unlocked: ' || achievement_record.name, 'completed');
            END IF;
            
            awarded_count := awarded_count + 1;
        END IF;
    END LOOP;
    
    RETURN awarded_count;
END;
$$;