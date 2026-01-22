-- Add more meaningful tasks with valid categories
INSERT INTO tasks (title, description, points_reward, category, difficulty, verification_type, is_active) VALUES
  ('Follow Our Twitter', 'Follow @ZambiaCash on Twitter and retweet our latest post about earning points', 20, 'social', 'easy', 'url', true),
  ('Join WhatsApp Group', 'Join our official WhatsApp community to get tips and updates on earning more points', 15, 'social', 'easy', 'url', true),
  ('Download Airtel Money App', 'Download and set up the Airtel Money app for faster withdrawals', 25, 'app_install', 'easy', 'timer', true),
  ('Watch MTN Promo Video', 'Watch the full MTN Mobile Money promotional video and learn about new features', 10, 'video_ad', 'easy', 'timer', true),
  ('Complete Profile Survey', 'Tell us about yourself to get personalized task recommendations', 30, 'survey', 'medium', 'survey', true),
  ('Refer a Friend Tutorial', 'Watch our referral tutorial video to learn how to earn bonus points', 15, 'learning', 'easy', 'timer', true),
  ('Rate Our App', 'Give us a rating and review on the app store to help us improve', 20, 'social', 'easy', 'url', true),
  ('Daily Check-in Challenge', 'Check in for 7 consecutive days to unlock bonus rewards', 50, 'challenge', 'medium', 'timer', true),
  ('Shop Online Challenge', 'Browse and add items to cart on our partner shopping sites', 20, 'shopping', 'easy', 'url', true),
  ('Learn Crypto Basics', 'Complete a short tutorial about cryptocurrency fundamentals', 25, 'learning', 'medium', 'timer', true),
  ('Quick Poll Response', 'Answer a 2-minute poll about your mobile usage habits', 10, 'quick', 'easy', 'survey', true),
  ('Lifestyle Survey', 'Share your lifestyle preferences to help us improve recommendations', 20, 'lifestyle', 'easy', 'survey', true)
ON CONFLICT DO NOTHING;