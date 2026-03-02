
-- Drop old constraint and add new one with more categories
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_category_check CHECK (
  category::text = ANY(ARRAY['survey', 'video_ad', 'app_install', 'social', 'gaming', 'lifestyle', 'shopping', 'learning', 'quick', 'challenge', 'digital', 'trivia', 'photo', 'market_research', 'feedback', 'partnership']::text[])
);

-- Drop old verification constraint and add gps
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_verification_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_verification_type_check CHECK (
  verification_type::text = ANY(ARRAY['instant', 'screenshot', 'survey', 'timer', 'url', 'ai_survey', 'quiz', 'data', 'gps']::text[])
);

-- Deactivate duplicate tasks
UPDATE tasks SET is_active = false WHERE id IN (
  '938c5f8f-fa65-40d9-851e-e87d4c81e8bd',
  '94307d93-14f3-4ed4-bb92-d8657eacb807',
  'e0e67a32-438e-436a-b189-6ed7f81d1d4f',
  '1f6ac71b-5686-46d6-b50b-ab474e6e61b2',
  '15b689b6-3af2-4841-a9f3-e2c536822241',
  '2356fd29-b748-49be-9177-802d5236a9e5',
  '89e520fc-eb9c-4551-99ea-047c39394073',
  '90321bb3-04dd-4084-a5f4-d5a0ce987046'
);

-- Insert diverse tasks
INSERT INTO tasks (title, description, points_reward, category, difficulty, verification_type, page_placement, is_active) VALUES
('Zambian Food Preferences Survey', 'Tell us about your favorite Zambian dishes, local restaurants, and food shopping habits.', 35, 'market_research', 'easy', 'survey', 'earn', true),
('Mobile Banking Usage Study', 'Share how you use mobile money services like Airtel Money, MTN MoMo, or Zanaco.', 40, 'market_research', 'medium', 'survey', 'earn', true),
('Entertainment Consumption Survey', 'What music, movies, TV shows and social media do you enjoy? Help companies understand audiences.', 30, 'market_research', 'easy', 'survey', 'discover', true),
('Zambian History Quiz', 'Test your knowledge of Zambian history from independence to modern day.', 45, 'learning', 'medium', 'quiz', 'earn', true),
('Financial Literacy Challenge', 'Learn about budgeting, saving, and investing basics through this quiz.', 50, 'learning', 'hard', 'quiz', 'earn', true),
('Digital Skills Assessment', 'Evaluate your digital literacy - internet safety, email etiquette, and basic skills.', 35, 'learning', 'easy', 'quiz', 'discover', true),
('Health & Wellness Quiz', 'Test your knowledge on nutrition, exercise, and common health practices.', 30, 'learning', 'easy', 'quiz', 'discover', true),
('Share Your Success Story', 'Post a screenshot of your earnings on WhatsApp Status to inspire others.', 25, 'social', 'easy', 'screenshot', 'earn', true),
('Community Engagement Post', 'Create a post on Facebook about a cause you care about. Screenshot for verification.', 30, 'social', 'medium', 'screenshot', 'discover', true),
('Rate Us on Play Store', 'Leave an honest review and rating for our app on the Google Play Store.', 40, 'social', 'easy', 'screenshot', 'earn', true),
('Morning Routine Check-in', 'Log your morning routine - wake time, breakfast, and goals for the day.', 20, 'lifestyle', 'easy', 'data', 'earn', true),
('Local Market Price Report', 'Report prices of 5 common items at your nearest market (mealie meal, tomatoes, onions, sugar, cooking oil).', 50, 'lifestyle', 'medium', 'data', 'earn', true),
('Fitness Goal Tracker', 'Set a daily fitness goal and track your steps, exercise, or activity.', 25, 'lifestyle', 'easy', 'data', 'discover', true),
('Speed Task Champion', 'Complete 3 different tasks within 30 minutes for bonus points!', 60, 'challenge', 'hard', 'timer', 'earn', true),
('Perfect Quiz Streak', 'Score 100% on any quiz task to earn bonus challenge points.', 50, 'challenge', 'hard', 'quiz', 'discover', true),
('Weekend Warrior Challenge', 'Complete all available tasks during a weekend campaign.', 75, 'challenge', 'hard', 'timer', 'earn', true),
('App Improvement Suggestions', 'Share your top 3 suggestions for improving our app.', 35, 'feedback', 'easy', 'survey', 'earn', true),
('Customer Service Feedback', 'Rate your experience with our support and withdrawal process.', 30, 'feedback', 'easy', 'survey', 'discover', true),
('Referral Program Feedback', 'Tell us about your experience with our referral program.', 25, 'feedback', 'easy', 'survey', 'earn', true),
('Secure Your Account', 'Update your profile with a strong password and verify your phone number.', 30, 'digital', 'easy', 'data', 'earn', true),
('Explore App Features', 'Navigate through all app sections and report what you found most useful.', 25, 'digital', 'easy', 'timer', 'discover', true),
('African Geography Quiz', 'How well do you know African countries, capitals, and landmarks?', 40, 'trivia', 'medium', 'quiz', 'earn', true),
('Sports Trivia Challenge', 'Test your knowledge of football, basketball, and sports popular in Zambia.', 35, 'trivia', 'medium', 'quiz', 'discover', true),
('Pop Culture Trivia', 'How well do you know trending music, movies, and social media culture?', 30, 'trivia', 'easy', 'quiz', 'earn', true),
('Science & Nature Quiz', 'Explore fascinating facts about science, nature, and the environment.', 45, 'trivia', 'hard', 'quiz', 'discover', true),
('Price Comparison Task', 'Compare prices of a popular product across 3 different online stores.', 35, 'shopping', 'medium', 'data', 'earn', true),
('Product Review Writer', 'Write a detailed review of a product you recently purchased.', 40, 'shopping', 'medium', 'data', 'discover', true),
('Game Score Challenge', 'Play any mini-game and achieve a score of 50+ points.', 30, 'gaming', 'medium', 'screenshot', 'earn', true),
('Tournament Qualifier', 'Join an active tournament and complete at least one round.', 35, 'gaming', 'medium', 'timer', 'discover', true),
('Transportation Survey', 'Share how you commute daily - bus, taxi, walking, or driving. Help improve local transport.', 30, 'survey', 'easy', 'survey', 'earn', true),
('Education Experience Survey', 'Tell us about your education background and learning preferences.', 35, 'survey', 'easy', 'survey', 'discover', true);
