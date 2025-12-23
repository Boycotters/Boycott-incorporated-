-- Create achievements table
CREATE TABLE public.achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'tasks', 'points', 'referrals', 'streak', 'special'
    requirement_type VARCHAR(50) NOT NULL, -- 'tasks_completed', 'points_earned', 'referrals_made', 'level_reached'
    requirement_value INTEGER NOT NULL,
    points_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Create user_achievements junction table
CREATE TABLE public.user_achievements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for achievements (anyone can view)
CREATE POLICY "Anyone can view achievements"
ON public.achievements
FOR SELECT
USING (is_active = true);

-- RLS policies for user_achievements
CREATE POLICY "Users can view own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seed initial achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points_reward) VALUES
-- Task achievements
('First Steps', 'Complete your first task', '🎯', 'tasks', 'tasks_completed', 1, 10),
('Getting Started', 'Complete 5 tasks', '🚀', 'tasks', 'tasks_completed', 5, 25),
('Task Master', 'Complete 10 tasks', '⚡', 'tasks', 'tasks_completed', 10, 50),
('Dedicated Worker', 'Complete 25 tasks', '💪', 'tasks', 'tasks_completed', 25, 100),
('Task Champion', 'Complete 50 tasks', '🏆', 'tasks', 'tasks_completed', 50, 200),
('Task Legend', 'Complete 100 tasks', '👑', 'tasks', 'tasks_completed', 100, 500),

-- Points achievements
('Point Starter', 'Earn 100 points', '💰', 'points', 'points_earned', 100, 10),
('Point Collector', 'Earn 500 points', '💎', 'points', 'points_earned', 500, 25),
('Point Hunter', 'Earn 1000 points', '🌟', 'points', 'points_earned', 1000, 50),
('Point Master', 'Earn 2500 points', '✨', 'points', 'points_earned', 2500, 100),
('Point Legend', 'Earn 5000 points', '🔥', 'points', 'points_earned', 5000, 250),

-- Referral achievements
('Social Butterfly', 'Refer your first friend', '🦋', 'referrals', 'referrals_made', 1, 50),
('Networker', 'Refer 3 friends', '🤝', 'referrals', 'referrals_made', 3, 100),
('Influencer', 'Refer 5 friends', '📣', 'referrals', 'referrals_made', 5, 200),
('Ambassador', 'Refer 10 friends', '🌐', 'referrals', 'referrals_made', 10, 500),

-- Level achievements
('Level Up', 'Reach level 2', '⬆️', 'levels', 'level_reached', 2, 25),
('Rising Star', 'Reach level 5', '⭐', 'levels', 'level_reached', 5, 100),
('Elite Member', 'Reach level 10', '🎖️', 'levels', 'level_reached', 10, 250);

-- Function to check and award achievements for a user
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
    achievement_record RECORD;
    awarded_count INTEGER := 0;
BEGIN
    -- Get user stats
    SELECT COUNT(*) INTO tasks_count 
    FROM user_tasks 
    WHERE user_id = p_user_id AND status = 'completed';
    
    SELECT COALESCE(total_points, 0), COALESCE(level, 1) 
    INTO total_pts, user_level 
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
           (achievement_record.requirement_type = 'level_reached' AND user_level >= achievement_record.requirement_value)
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