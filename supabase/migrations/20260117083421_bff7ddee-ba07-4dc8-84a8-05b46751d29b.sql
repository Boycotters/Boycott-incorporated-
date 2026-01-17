-- Update verification_type constraint to allow quiz type
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_verification_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_verification_type_check 
CHECK (verification_type IN ('instant', 'screenshot', 'survey', 'timer', 'url', 'ai_survey', 'quiz', 'data'));

-- Add remaining tasks with correct verification types
INSERT INTO public.tasks (title, description, points_reward, category, difficulty, verification_type, is_active) VALUES
-- Learning Tasks with quiz type
('Complete Money Management Quiz', 'Learn about budgeting and pass the quiz', 30, 'learning', 'medium', 'survey', true),
('Digital Safety Tutorial', 'Learn about online safety and security', 25, 'learning', 'easy', 'survey', true),
('Entrepreneur Basics Course', 'Complete basic business skills module', 50, 'learning', 'hard', 'survey', true),
-- Challenge/Engagement Tasks
('Rate Our App on Play Store', 'Leave an honest review on Google Play', 30, 'challenge', 'easy', 'screenshot', true),
('Invite 5 Friends Challenge', 'Get 5 friends to join JoyCards', 150, 'challenge', 'hard', 'instant', true),
('Complete Weekly Streak', 'Log in and earn every day for 7 days', 75, 'challenge', 'medium', 'instant', true),
('Play All 4 Games', 'Try each mini-game at least once today', 40, 'gaming', 'medium', 'instant', true),
('Watch 5 Videos Challenge', 'Complete 5 video watches today', 35, 'video_ad', 'medium', 'timer', true),
-- Quick Tasks
('Update Your Profile Info', 'Complete all profile fields including NRC', 40, 'quick', 'easy', 'instant', true),
('Verify Phone Number', 'Add and verify your mobile number', 25, 'quick', 'easy', 'instant', true),
('Set Your Preferences', 'Choose your interests and notification settings', 15, 'quick', 'easy', 'instant', true)
ON CONFLICT DO NOTHING;