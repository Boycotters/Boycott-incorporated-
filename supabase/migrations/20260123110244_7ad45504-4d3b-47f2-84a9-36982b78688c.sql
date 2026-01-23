-- Add more tasks with valid categories per check constraint
INSERT INTO tasks (title, description, points_reward, category, difficulty, verification_type, is_active) VALUES
  ('Quick Lifestyle Poll', 'Answer a 2-minute poll about your daily habits and preferences', 15, 'lifestyle', 'easy', 'survey', true),
  ('Download Kazang App', 'Download and register on the Kazang app for convenient mobile payments', 25, 'app_install', 'easy', 'timer', true),
  ('Watch Educational Video', 'Watch a short video about financial literacy tips', 10, 'learning', 'easy', 'timer', true),
  ('Social Media Share', 'Share our app on your social media and earn rewards', 20, 'social', 'easy', 'url', true),
  ('Browse Gaming Section', 'Explore and browse our gaming partners collection', 15, 'gaming', 'easy', 'timer', true),
  ('Complete Shopping Survey', 'Tell us about your shopping preferences and habits', 20, 'shopping', 'medium', 'survey', true)
ON CONFLICT DO NOTHING;

-- Fix users with NULL referral codes
UPDATE users 
SET referral_code = UPPER(SUBSTRING(MD5(id::text || created_at::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;