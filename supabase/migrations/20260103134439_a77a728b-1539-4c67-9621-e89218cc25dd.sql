-- Add more diverse tasks using valid categories and verification_types
INSERT INTO public.tasks (title, description, category, difficulty, points_reward, verification_type, is_active) VALUES
-- Survey Tasks
('Quick Feedback Survey', 'Share your thoughts in a 2-minute survey about app features', 'survey', 'easy', 25, 'screenshot', true),
('Product Research Survey', 'Help us understand your shopping preferences', 'survey', 'medium', 50, 'screenshot', true),
('Lifestyle Preferences Survey', 'Tell us about your daily habits and interests', 'survey', 'medium', 45, 'screenshot', true),
('App Experience Survey', 'Rate your experience with our platform', 'survey', 'easy', 30, 'screenshot', true),
('Market Research Survey', 'Share insights about trends you follow', 'survey', 'hard', 75, 'screenshot', true),
('Opinion Poll', 'Vote in our weekly opinion poll', 'survey', 'easy', 15, 'instant', true),
('Brand Awareness Survey', 'Share which brands you recognize', 'survey', 'medium', 40, 'screenshot', true),

-- Video Ad Tasks
('Watch Featured Video', 'Watch our latest featured video for 30 seconds', 'video_ad', 'easy', 15, 'timer', true),
('Complete Video Series', 'Watch 3 videos from our partner channels', 'video_ad', 'medium', 40, 'timer', true),
('Educational Video Marathon', 'Watch 5 educational videos', 'video_ad', 'hard', 100, 'timer', true),
('Daily Video Check-in', 'Watch at least one video today', 'video_ad', 'easy', 10, 'timer', true),
('Premium Video Content', 'Watch exclusive premium content', 'video_ad', 'medium', 35, 'timer', true),

-- Shopping Tasks
('Browse Flash Deals', 'Check out our flash deal section', 'shopping', 'easy', 20, 'timer', true),
('Create Wishlist', 'Add 3 items to your wishlist', 'shopping', 'easy', 25, 'screenshot', true),
('Review a Product', 'Write a review for any marketplace item', 'shopping', 'medium', 50, 'screenshot', true),
('Share a Deal', 'Share a deal with your friends', 'shopping', 'easy', 30, 'screenshot', true),
('Price Drop Alert', 'Set up a price drop alert for an item', 'shopping', 'easy', 15, 'screenshot', true),

-- Learning Tasks  
('Complete Tutorial', 'Finish the app onboarding tutorial', 'learning', 'easy', 35, 'instant', true),
('Read Daily Tips', 'Read all 3 daily tips in the app', 'learning', 'easy', 15, 'timer', true),
('Quiz Challenge', 'Score 80% or higher on the daily quiz', 'learning', 'medium', 60, 'screenshot', true),
('Skill Assessment', 'Complete a skill assessment test', 'learning', 'hard', 100, 'screenshot', true),
('Watch Tutorial Video', 'Complete a how-to tutorial', 'learning', 'easy', 20, 'timer', true),

-- Quick Tasks
('Daily Check-in', 'Open the app and check in', 'quick', 'easy', 5, 'instant', true),
('Profile Completion', 'Complete your profile 100%', 'quick', 'medium', 75, 'screenshot', true),
('Enable Notifications', 'Turn on push notifications', 'quick', 'easy', 20, 'instant', true),
('Invite a Friend', 'Send an invite link to a friend', 'quick', 'easy', 50, 'screenshot', true),
('Weekly Goal Setter', 'Set your weekly earning goal', 'quick', 'easy', 15, 'instant', true),
('Update Avatar', 'Upload a profile picture', 'quick', 'easy', 10, 'screenshot', true),

-- Challenge Tasks
('Weekend Warrior', 'Complete 5 tasks over the weekend', 'challenge', 'medium', 100, 'instant', true),
('Night Owl Bonus', 'Complete a task after 10 PM', 'challenge', 'easy', 25, 'instant', true),
('Early Bird Reward', 'Complete a task before 8 AM', 'challenge', 'easy', 25, 'instant', true),
('Lucky Spin Entry', 'Earn entry to the lucky spin wheel', 'challenge', 'easy', 10, 'instant', true),
('VIP Preview', 'Preview exclusive VIP features', 'challenge', 'easy', 20, 'timer', true),
('Daily Double', 'Complete 2 tasks in under 5 minutes', 'challenge', 'medium', 50, 'instant', true),

-- Social Tasks
('Share Your Code', 'Share your referral code on social media', 'social', 'easy', 30, 'screenshot', true),
('Referral Milestone', 'Successfully refer 3 friends who sign up', 'social', 'hard', 250, 'instant', true),
('Friend Activity Bonus', 'Earn when your referrals complete tasks', 'social', 'medium', 50, 'instant', true),
('Join Community', 'Join our Telegram or Discord community', 'social', 'easy', 25, 'screenshot', true),
('Share Achievement', 'Post your achievement on social media', 'social', 'easy', 20, 'screenshot', true),

-- App Install Tasks
('Download Partner App', 'Install and open a partner application', 'app_install', 'medium', 100, 'screenshot', true),
('Complete App Tutorial', 'Finish the onboarding in partner app', 'app_install', 'hard', 150, 'screenshot', true),
('Reach Level 5', 'Reach level 5 in a partner game', 'app_install', 'hard', 200, 'screenshot', true),
('Free Trial Signup', 'Start a free trial with our partner', 'app_install', 'medium', 75, 'screenshot', true),

-- Lifestyle Tasks  
('Morning Routine Check', 'Log your morning routine', 'lifestyle', 'easy', 15, 'instant', true),
('Fitness Goal', 'Log a workout or fitness activity', 'lifestyle', 'medium', 40, 'screenshot', true),
('Healthy Meal Photo', 'Share a photo of a healthy meal', 'lifestyle', 'easy', 25, 'screenshot', true),
('Mood Check-in', 'Rate your mood for the day', 'lifestyle', 'easy', 10, 'instant', true);

-- Create wallet trigger for new users
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, available_points, locked_points)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_user_created_create_wallet ON public.users;
CREATE TRIGGER on_user_created_create_wallet
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_for_user();

-- Ensure all existing users have wallets
INSERT INTO public.wallets (user_id, available_points, locked_points)
SELECT id, 0, 0 FROM public.users u
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id);