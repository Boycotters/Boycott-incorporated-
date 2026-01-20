-- =============================================
-- FIX 4: Clear old completed tasks (keep only last 7 days)
-- =============================================

-- Create function to cleanup old completed tasks
CREATE OR REPLACE FUNCTION public.cleanup_old_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_tasks
  WHERE status = 'completed'
    AND completed_at < CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- =============================================
-- FIX 5: Add more Zambian-themed videos (10 points each)
-- =============================================

-- First update all existing videos to 10 points
UPDATE public.videos SET points_reward = 10;

-- Delete Chromecast videos
DELETE FROM public.videos WHERE title LIKE '%Chromecast%' OR description LIKE '%Chromecast%';

-- Add Zambian entertainment videos
INSERT INTO public.videos (title, description, video_url, category, points_reward, duration_seconds, is_active, source, partner_name) VALUES
-- Zambian Comedy
('Zambian Comedy: Thomas Sipalo', 'Hilarious stand-up comedy from Zambia', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'entertainment', 10, 180, true, 'partner', 'Zambian Comedy'),
('K''Millian Comedy Skits', 'Best comedy skits from Lusaka', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'entertainment', 10, 120, true, 'partner', 'Zambian Comedy'),
('Muvi TV Funny Moments', 'Hilarious Zambian TV moments', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'entertainment', 10, 150, true, 'partner', 'Muvi TV'),
('Zambian Pranks Compilation', 'Best pranks from Lusaka streets', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'entertainment', 10, 180, true, 'partner', 'ZedPranks'),

-- Educational/Tutorials
('Start a Business in Zambia', 'Guide to registering your business', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'education', 10, 300, true, 'partner', 'ZedBusiness'),
('Mobile Money Tips', 'Get the most from mobile money', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'education', 10, 180, true, 'partner', 'FinTech Zambia'),
('Learn Bemba Basics', 'Essential Bemba phrases', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'education', 10, 240, true, 'partner', 'Learn Zambian'),
('UNZA Campus Tour', 'University of Zambia tour', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'education', 10, 300, true, 'partner', 'UNZA'),

-- Music & Culture
('Zambian Music Mix 2026', 'Top Zambian hits', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'entertainment', 10, 300, true, 'partner', 'Zed Music'),
('Zambian Dance Tutorial', 'Learn traditional dances', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'entertainment', 10, 240, true, 'partner', 'Zed Dance'),
('Victoria Falls Documentary', 'Majestic Victoria Falls', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'education', 10, 300, true, 'partner', 'Zambia Tourism'),

-- Sports
('Chipolopolo Highlights', 'Zambia national team moments', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'sports', 10, 180, true, 'partner', 'Zed Sports'),
('ZESCO United Highlights', 'Top plays from ZESCO', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'sports', 10, 180, true, 'partner', 'Zed Sports'),

-- Ads/Sponsored
('MTN Zambia: Connected', 'Experience connection power', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'ads', 10, 30, true, 'partner', 'MTN Zambia'),
('Airtel Money: Fast', 'Fast secure mobile money', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'ads', 10, 30, true, 'partner', 'Airtel Zambia'),
('Zambeef: Quality', 'Fresh quality meat', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'ads', 10, 30, true, 'partner', 'Zambeef'),
('Trade Kings: Local', 'Quality local products', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'ads', 10, 30, true, 'partner', 'Trade Kings'),
('Shoprite: Savings', 'Shop smart save big', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'ads', 10, 30, true, 'partner', 'Shoprite Zambia')
ON CONFLICT DO NOTHING;

-- =============================================
-- FIX 6: Rebalance task rewards for 180 daily cap
-- =============================================

-- Update task rewards based on category
UPDATE public.tasks SET points_reward = 20 WHERE category = 'survey' AND is_active = true;
UPDATE public.tasks SET points_reward = 20 WHERE category = 'social' AND is_active = true;
UPDATE public.tasks SET points_reward = 15 WHERE category = 'learning' AND is_active = true;
UPDATE public.tasks SET points_reward = 15 WHERE category = 'lifestyle' AND is_active = true;
UPDATE public.tasks SET points_reward = 10 WHERE category = 'quick' AND is_active = true;
UPDATE public.tasks SET points_reward = 10 WHERE category = 'video_ad' AND is_active = true;

-- Add more diverse tasks with correct categories
INSERT INTO public.tasks (title, description, category, points_reward, difficulty, verification_type, is_active) VALUES
-- Survey tasks (20 pts each)
('Consumer Habits Survey', 'Share your shopping preferences', 'survey', 20, 'medium', 'survey', true),
('Technology Usage Survey', 'Tell us about your tech usage', 'survey', 20, 'medium', 'survey', true),
('Entertainment Preferences', 'What entertainment do you enjoy?', 'survey', 20, 'medium', 'survey', true),
('Food & Dining Survey', 'Share your food preferences', 'survey', 20, 'medium', 'survey', true),
('Travel Habits Survey', 'Tell us about your travel habits', 'survey', 20, 'medium', 'survey', true),
('Mobile Usage Survey', 'How do you use your phone?', 'survey', 20, 'medium', 'survey', true),
('Shopping Survey', 'Where do you shop most?', 'survey', 20, 'medium', 'survey', true),

-- Social tasks (20 pts each)
('Follow on Facebook', 'Follow our Facebook page', 'social', 20, 'easy', 'url', true),
('Share on WhatsApp', 'Share JoyCards with friends', 'social', 20, 'easy', 'timer', true),
('Join Telegram Group', 'Join our Telegram community', 'social', 20, 'easy', 'url', true),

-- Learning tasks (15 pts)
('Mobile Money Guide', 'Read our mobile money guide', 'learning', 15, 'easy', 'timer', true),
('Financial Literacy Quiz', 'Test your money knowledge', 'learning', 15, 'medium', 'quiz', true),
('Zambian History Lesson', 'Learn about Zambia history', 'learning', 15, 'medium', 'timer', true),
('Savings Tips', 'Learn how to save money', 'learning', 15, 'easy', 'timer', true),

-- Quick tasks (10 pts)
('Daily Check-in', 'Open the app daily', 'quick', 10, 'easy', 'instant', true),
('Update Profile', 'Complete your profile info', 'quick', 10, 'easy', 'instant', true),
('Enable Notifications', 'Turn on push notifications', 'quick', 10, 'easy', 'instant', true)
ON CONFLICT DO NOTHING;

-- =============================================
-- FIX 7: Update are_tasks_available_today for weekends
-- =============================================

CREATE OR REPLACE FUNCTION public.are_tasks_available_today()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_weekend BOOLEAN;
  v_active_campaign RECORD;
BEGIN
  -- Get current day (0 = Sunday, 6 = Saturday)
  v_day_of_week := EXTRACT(DOW FROM CURRENT_DATE);
  v_is_weekend := v_day_of_week IN (0, 6);
  
  -- Check for active weekend campaign
  SELECT * INTO v_active_campaign
  FROM public.weekend_campaigns
  WHERE is_active = true
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
  LIMIT 1;
  
  IF v_is_weekend AND v_active_campaign IS NULL THEN
    RETURN json_build_object(
      'available', false,
      'is_weekend', true,
      'has_campaign', false,
      'message', 'Tasks are locked on weekends. Come back Monday or wait for a special campaign!'
    );
  END IF;
  
  IF v_is_weekend AND v_active_campaign IS NOT NULL THEN
    RETURN json_build_object(
      'available', true,
      'is_weekend', true,
      'has_campaign', true,
      'campaign_name', v_active_campaign.name,
      'bonus_multiplier', v_active_campaign.bonus_multiplier,
      'message', format('Weekend Campaign: %s! Earn %sx bonus!', v_active_campaign.name, v_active_campaign.bonus_multiplier)
    );
  END IF;
  
  RETURN json_build_object(
    'available', true,
    'is_weekend', false,
    'has_campaign', false,
    'message', 'Tasks available today!'
  );
END;
$$;