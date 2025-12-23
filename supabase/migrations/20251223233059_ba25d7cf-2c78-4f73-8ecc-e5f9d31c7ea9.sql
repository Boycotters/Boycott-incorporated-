-- Insert sample tasks with valid categories
INSERT INTO tasks (title, description, points_reward, category, difficulty, verification_type, is_active) VALUES
('Follow us on Twitter', 'Follow our official Twitter account and stay updated', 50, 'social', 'easy', 'url', true),
('Share a post', 'Share any of our posts on your social media', 30, 'social', 'easy', 'screenshot', true),
('Complete daily survey', 'Answer a quick 5-question survey', 25, 'survey', 'easy', 'instant', true),
('Watch tutorial video', 'Watch our 5-minute tutorial video', 25, 'video_ad', 'easy', 'timer', true),
('Install partner app', 'Download and open our partner app', 100, 'app_install', 'medium', 'screenshot', true),
('Complete quick task', 'Finish this quick 2-minute task', 15, 'quick', 'easy', 'instant', true),
('Join Discord server', 'Join our community Discord server', 35, 'social', 'easy', 'url', true),
('Complete learning module', 'Finish our intro learning module', 40, 'learning', 'medium', 'timer', true),
('Weekly challenge', 'Complete all daily tasks this week', 150, 'challenge', 'hard', 'instant', true),
('Shop partner store', 'Make a purchase from partner store', 75, 'shopping', 'medium', 'screenshot', true);

-- Insert sample rewards
INSERT INTO rewards (name, description, points_cost, category, stock, is_active, image) VALUES
('$5 Gift Card', 'Amazon gift card worth $5', 500, 'gift_cards', 100, true, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'),
('$10 Gift Card', 'Amazon gift card worth $10', 950, 'gift_cards', 50, true, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'),
('Premium Badge', 'Exclusive premium member badge', 200, 'digital', 999, true, 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=400'),
('Custom Avatar Frame', 'Unique avatar frame for your profile', 150, 'digital', 999, true, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400'),
('Early Access Pass', 'Get early access to new features', 300, 'access', 50, true, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400'),
('VIP Support', 'Priority customer support for 1 month', 400, 'services', 25, true, 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400');

-- Insert sample achievements
INSERT INTO achievements (name, description, category, icon, requirement_type, requirement_value, points_reward, is_active) VALUES
('First Steps', 'Complete your first task', 'tasks', '🎯', 'tasks_completed', 1, 10, true),
('Task Master', 'Complete 10 tasks', 'tasks', '⭐', 'tasks_completed', 10, 50, true),
('Point Collector', 'Earn 500 points', 'points', '💰', 'points_earned', 500, 25, true),
('Social Butterfly', 'Complete 5 social tasks', 'social', '🦋', 'social_tasks', 5, 30, true),
('Streak Starter', 'Maintain a 3-day streak', 'streaks', '🔥', 'streak_days', 3, 20, true),
('Week Warrior', 'Maintain a 7-day streak', 'streaks', '💪', 'streak_days', 7, 50, true);

-- Insert VIP tiers if not exist
INSERT INTO vip_tiers (name, slug, min_points, multiplier, color, icon, benefits) VALUES
('Bronze', 'bronze', 0, 1.0, '#CD7F32', '🥉', ARRAY['Basic rewards access', 'Standard support']),
('Silver', 'silver', 1000, 1.25, '#C0C0C0', '🥈', ARRAY['1.25x points multiplier', 'Priority support', 'Exclusive rewards']),
('Gold', 'gold', 5000, 1.5, '#FFD700', '🥇', ARRAY['1.5x points multiplier', 'VIP support', 'Early access', 'Special badges']),
('Platinum', 'platinum', 15000, 2.0, '#E5E4E2', '💎', ARRAY['2x points multiplier', 'Dedicated support', 'All rewards access', 'Exclusive events'])
ON CONFLICT DO NOTHING;