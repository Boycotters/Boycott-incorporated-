-- Drop the old restrictive category check constraint
ALTER TABLE tasks DROP CONSTRAINT tasks_category_check;

-- Add new constraint with expanded categories
ALTER TABLE tasks ADD CONSTRAINT tasks_category_check 
CHECK (category IN ('survey', 'video_ad', 'app_install', 'social', 'gaming', 'lifestyle', 'shopping', 'learning', 'quick', 'challenge'));

-- Delete old boring tasks
DELETE FROM tasks;

-- Insert diverse, fun, trendy tasks (25-200 pts range)
INSERT INTO tasks (title, description, points_reward, category, difficulty, is_active) VALUES
-- Social Media (Gen Z friendly)
('TikTok Trend Check', 'Watch and rate 3 trending TikTok videos', 35, 'social', 'easy', true),
('Share Your Vibe', 'Post a story about your current mood with our branded filter', 50, 'social', 'easy', true),
('Meme Review', 'Rate 5 memes and pick the funniest one', 30, 'social', 'easy', true),
('Content Creator Challenge', 'Create a 15-second video reviewing a product', 150, 'social', 'hard', true),
('Hashtag Hunter', 'Find and engage with 10 posts using a specific hashtag', 60, 'social', 'medium', true),

-- Gaming & Entertainment
('Quick Quiz Master', 'Score 80%+ on our pop culture trivia quiz', 75, 'gaming', 'medium', true),
('Reaction Time Test', 'Beat the target time in our reaction game', 45, 'gaming', 'easy', true),
('Puzzle Solver', 'Complete a daily brain teaser puzzle', 40, 'gaming', 'easy', true),
('Mini Game Marathon', 'Play 3 different mini-games in one session', 100, 'gaming', 'medium', true),
('Boss Level Challenger', 'Complete the weekly challenge puzzle under 5 minutes', 200, 'gaming', 'hard', true),

-- Lifestyle & Wellness (Millennial friendly)
('Morning Routine Logger', 'Log your morning routine and wellness habits', 50, 'lifestyle', 'easy', true),
('Recipe Rating', 'Rate and review 3 recipes from our partner brands', 65, 'lifestyle', 'easy', true),
('Fitness Check-In', 'Log your daily steps or workout activity', 40, 'lifestyle', 'easy', true),
('Mindful Moment', 'Complete a 5-minute meditation session', 55, 'lifestyle', 'medium', true),
('Weekly Wellness Goal', 'Set and track a wellness goal for the week', 120, 'lifestyle', 'medium', true),

-- Shopping & Reviews
('Flash Deal Finder', 'Find the best deal from our flash sale section', 35, 'shopping', 'easy', true),
('Product Snap Review', 'Take a photo review of any product you own', 80, 'shopping', 'medium', true),
('Wishlist Builder', 'Create a wishlist with 5+ items and share it', 45, 'shopping', 'easy', true),
('Detailed Product Review', 'Write a 100+ word review with pros/cons', 125, 'shopping', 'medium', true),
('Mystery Box Reveal', 'Open and review a mystery product sample', 175, 'shopping', 'hard', true),

-- Learning & Discovery
('Daily Knowledge Drop', 'Read and answer questions about today''s featured article', 30, 'learning', 'easy', true),
('Skill Builder', 'Complete a short tutorial or mini-course module', 85, 'learning', 'medium', true),
('Trend Spotter', 'Identify and report on an emerging trend in your area', 95, 'learning', 'medium', true),
('Expert Quiz', 'Pass an advanced knowledge test in your chosen category', 160, 'learning', 'hard', true),

-- Quick Wins
('Daily Spin', 'Spin the daily wheel for bonus rewards', 25, 'quick', 'easy', true),
('Watch & Earn', 'Watch a 30-second partner video', 25, 'quick', 'easy', true),
('Quick Poll', 'Answer today''s quick poll question', 25, 'quick', 'easy', true),
('Profile Boost', 'Update your profile with new interests', 35, 'quick', 'easy', true),

-- Challenge Tasks
('7-Day Streak Master', 'Complete at least 1 task every day for 7 days', 180, 'challenge', 'hard', true),
('Points Collector', 'Earn 500 points in a single week', 150, 'challenge', 'hard', true),
('Social Butterfly', 'Refer 3 friends to join the platform', 200, 'challenge', 'hard', true);