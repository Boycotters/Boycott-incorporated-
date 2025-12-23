-- Insert sample tasks using valid categories
INSERT INTO tasks (title, description, category, difficulty, points_reward, is_active) VALUES
-- Social Media Tasks
('Follow us on Facebook', 'Like and follow our official Facebook page', 'social', 'easy', 50, true),
('Share on WhatsApp', 'Share our app with 3 friends on WhatsApp', 'social', 'easy', 75, true),
('Join our Telegram Group', 'Join our community on Telegram for updates', 'social', 'easy', 50, true),
('Post a Review', 'Write a review about your experience with ZamPoints', 'social', 'medium', 150, true),
('Create a TikTok Video', 'Make a short video about ZamPoints and tag us', 'social', 'hard', 500, true),

-- Survey Tasks
('Complete Welcome Survey', 'Tell us about yourself to personalize your experience', 'survey', 'easy', 100, true),
('Product Feedback Survey', 'Share your thoughts on local products and services', 'survey', 'medium', 200, true),
('Monthly Satisfaction Survey', 'Rate your experience this month', 'survey', 'easy', 75, true),
('Market Research Survey', 'Help brands understand Zambian consumers better', 'survey', 'medium', 250, true),

-- Quick Tasks
('Daily Check-in', 'Open the app and claim your daily bonus', 'quick', 'easy', 10, true),
('Verify Email Address', 'Confirm your email to secure your account', 'quick', 'easy', 50, true),
('Add Phone Number', 'Add and verify your Zambian phone number', 'quick', 'easy', 75, true),
('Complete Profile', 'Fill in all your profile information', 'quick', 'easy', 100, true),
('Upload Profile Photo', 'Add a profile picture to personalize your account', 'quick', 'easy', 25, true),
('Enable Notifications', 'Turn on push notifications for updates', 'quick', 'easy', 25, true),

-- Video Ad Tasks
('Watch a Promo Video', 'Watch a short promotional video', 'video_ad', 'easy', 25, true),
('Watch 3 Videos Today', 'Complete 3 video ads in one session', 'video_ad', 'easy', 50, true),
('Daily Video Bonus', 'Watch your daily featured video', 'video_ad', 'easy', 30, true),

-- App Install Tasks
('Download Partner App', 'Install one of our partner apps', 'app_install', 'medium', 300, true),
('Try Gaming App', 'Download and play a partner game for 5 minutes', 'app_install', 'medium', 250, true),
('Install Shopping App', 'Download a local e-commerce app', 'app_install', 'easy', 200, true),

-- Shopping Tasks
('Browse Marketplace', 'Explore 5 different rewards in the marketplace', 'shopping', 'easy', 30, true),
('Add to Wishlist', 'Save 3 rewards to your wishlist', 'shopping', 'easy', 20, true),
('First Redemption', 'Redeem your first reward from the marketplace', 'shopping', 'medium', 200, true),
('Redeem 5 Rewards', 'Successfully redeem 5 different rewards', 'shopping', 'hard', 500, true),

-- Gaming Tasks
('Play Daily Mini-Game', 'Complete the daily puzzle challenge', 'gaming', 'easy', 50, true),
('Win 3 Games', 'Win 3 mini-game challenges', 'gaming', 'medium', 150, true),
('High Score Champion', 'Beat the weekly high score', 'gaming', 'hard', 400, true),

-- Learning Tasks
('Read App Guide', 'Learn how to maximize your points earning', 'learning', 'easy', 50, true),
('Watch Tutorial Video', 'Complete the ZamPoints tutorial series', 'learning', 'easy', 75, true),
('Take the Points Quiz', 'Test your knowledge about earning points', 'learning', 'medium', 150, true),
('Financial Tips Course', 'Complete a short course on saving money', 'learning', 'medium', 200, true),

-- Challenge Tasks
('Complete 3 Tasks Today', 'Finish any 3 tasks in a single day', 'challenge', 'medium', 100, true),
('Streak Master', 'Maintain a 7-day login streak', 'challenge', 'hard', 300, true),
('30 Day Warrior', 'Login for 30 consecutive days', 'challenge', 'hard', 1000, true),
('Point Collector', 'Earn 1000 points in a single week', 'challenge', 'hard', 500, true),
('Social Butterfly', 'Complete all social media tasks', 'challenge', 'medium', 250, true),

-- Lifestyle Tasks
('Rate the App', 'Give us a rating on the app store', 'lifestyle', 'easy', 100, true),
('Refer a Friend', 'Invite a friend using your referral code', 'lifestyle', 'easy', 100, true),
('Refer 5 Friends', 'Get 5 friends to sign up using your code', 'lifestyle', 'hard', 750, true),
('First Successful Referral', 'Your referred friend completes their first task', 'lifestyle', 'medium', 200, true);