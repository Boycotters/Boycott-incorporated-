-- Delete all existing videos and add fresh diverse Zambian content
DELETE FROM videos;

-- Insert comprehensive Zambian-relevant videos
INSERT INTO videos (title, description, video_url, duration_seconds, points_reward, category, source, partner_name, is_active) VALUES
-- How to Earn Tutorials
('How to Earn on Pesa Rewards', 'Complete beginner guide - watch videos, complete tasks, and get paid in mobile money', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 45, 25, 'tutorial', 'admin', NULL, true),
('Mastering Daily Tasks', 'Learn the fastest ways to complete tasks and maximize your daily earnings', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 40, 20, 'tutorial', 'admin', NULL, true),
('VIP Tiers Explained', 'Unlock bigger rewards - understand Bronze, Silver, Gold, Diamond, and Platinum benefits', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 35, 18, 'tutorial', 'admin', NULL, true),
('Referral Program Secrets', 'Invite friends and earn bonus points - step by step referral guide', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 30, 15, 'tutorial', 'admin', NULL, true),
('Streak Bonuses Guide', 'Never break your streak - tips to maintain daily logins and earn streak rewards', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 25, 12, 'tutorial', 'admin', NULL, true),

-- Money & Finance Education
('Mobile Money Safety Tips', 'Protect your Airtel Money, MTN MoMo, and Zamtel Kwacha accounts from fraud', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 50, 22, 'education', 'admin', NULL, true),
('Saving Money in Zambia', 'Practical tips for Zambians to save more Kwacha every month', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 55, 25, 'education', 'admin', NULL, true),
('Starting a Small Business', 'Business ideas and tips for young Zambian entrepreneurs', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 60, 28, 'education', 'admin', NULL, true),
('Understanding Taxes in Zambia', 'Simple guide to ZRA taxes for small earners and businesses', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 45, 20, 'education', 'admin', NULL, true),

-- Entertainment
('Top Zambian Music 2026', 'The hottest songs from Zambian artists right now', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 40, 10, 'entertainment', 'admin', NULL, true),
('Lusaka Nightlife Guide', 'Best places to hang out in Lusaka - clubs, restaurants, and more', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', 35, 8, 'entertainment', 'admin', NULL, true),
('Zambian Comedy Highlights', 'Laugh with the funniest Zambian comedians', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', 45, 12, 'entertainment', 'admin', NULL, true),
('Victoria Falls Adventure', 'Explore the majestic Victoria Falls and adventure activities', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', 50, 15, 'entertainment', 'admin', NULL, true),

-- Lifestyle
('Zambian Street Food Tour', 'The best street food across Zambia - Kapenta, Nshima, Ifisashi and more', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 40, 12, 'lifestyle', 'admin', NULL, true),
('Budget Shopping in Lusaka', 'Where to find the best deals in markets and shops', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 35, 10, 'lifestyle', 'admin', NULL, true),
('Fitness on a Budget', 'Stay fit without expensive gym memberships - home workouts for Zambians', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 30, 10, 'lifestyle', 'admin', NULL, true),
('Zambian Fashion Trends', 'Chitenge styles and modern Zambian fashion inspiration', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 35, 10, 'lifestyle', 'admin', NULL, true),

-- Tech Tutorials
('Smartphone Tips & Tricks', 'Get more from your Android phone - useful apps and settings', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 40, 15, 'tutorial', 'admin', NULL, true),
('Free WiFi Spots in Lusaka', 'Where to find free internet in the city', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 25, 8, 'tutorial', 'admin', NULL, true),
('Using WhatsApp Business', 'Grow your small business with WhatsApp Business features', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 45, 18, 'tutorial', 'admin', NULL, true),

-- Partner Content
('Shop Smart at Shoprite', 'Weekly deals and loyalty rewards at Shoprite Zambia', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', 30, 15, 'partner', 'partner', 'Shoprite', true),
('MTN Zambia Deals', 'Get more data and airtime with MTN promotions', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 25, 12, 'partner', 'partner', 'MTN Zambia', true),
('Airtel Money Made Easy', 'Send, receive, and pay bills with Airtel Money', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 30, 12, 'partner', 'partner', 'Airtel Zambia', true),
('Zamtel Kwacha Tips', 'Maximize your mobile money with Zamtel Kwacha', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', 25, 10, 'partner', 'partner', 'Zamtel', true),
('Game Stores Zambia', 'Electronics and appliance deals at Game Stores', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', 30, 12, 'partner', 'partner', 'Game Stores', true);

-- Update VIP tiers with higher costs and better benefits
UPDATE vip_tiers SET 
  min_points = 0,
  upgrade_cost = 0,
  multiplier = 1.0,
  daily_task_bonus = 0,
  benefits = ARRAY[
    'Access to basic rewards',
    'Daily login bonus (5 pts)',
    'Standard task rewards',
    'Basic referral bonus (50 pts)',
    'Community access'
  ]
WHERE slug = 'bronze';

UPDATE vip_tiers SET 
  min_points = 5000,
  upgrade_cost = 2500,
  multiplier = 1.25,
  daily_task_bonus = 5,
  benefits = ARRAY[
    '25% bonus on ALL points earned',
    '+5 daily task bonus points',
    'Early access to new tasks',
    'Silver-exclusive rewards in marketplace',
    'Priority customer support',
    'Enhanced referral bonus (100 pts)',
    'Silver member badge'
  ]
WHERE slug = 'silver';

UPDATE vip_tiers SET 
  min_points = 25000,
  upgrade_cost = 10000,
  multiplier = 1.5,
  daily_task_bonus = 10,
  benefits = ARRAY[
    '50% bonus on ALL points earned',
    '+10 daily task bonus points',
    'Gold-exclusive premium rewards',
    'Double streak bonuses',
    'VIP-only challenges (high reward)',
    'Monthly bonus rewards (500 pts)',
    'Enhanced referral bonus (200 pts)',
    'Gold member badge',
    'Access to partner exclusive deals'
  ]
WHERE slug = 'gold';

UPDATE vip_tiers SET 
  min_points = 75000,
  upgrade_cost = 35000,
  multiplier = 2.0,
  daily_task_bonus = 20,
  benefits = ARRAY[
    '100% bonus on ALL points earned (2x)',
    '+20 daily task bonus points',
    'Diamond-exclusive luxury rewards',
    'Triple streak bonuses',
    'First access to ALL new features',
    'Personal reward requests',
    'Diamond-only mega tasks',
    'Monthly bonus rewards (1500 pts)',
    'Enhanced referral bonus (500 pts)',
    'Diamond member badge',
    'Dedicated account manager',
    'Exclusive partner VIP deals'
  ]
WHERE slug = 'diamond';

UPDATE vip_tiers SET 
  min_points = 200000,
  upgrade_cost = 100000,
  multiplier = 2.5,
  daily_task_bonus = 35,
  benefits = ARRAY[
    '150% bonus on ALL points earned (2.5x)',
    '+35 daily task bonus points',
    'Platinum-exclusive elite rewards',
    'Quadruple streak bonuses',
    'Instant withdrawal processing',
    'Custom reward creation',
    'Private Platinum community access',
    'Monthly bonus rewards (3000 pts)',
    'Enhanced referral bonus (1000 pts)',
    'Platinum elite badge',
    'Personal concierge support',
    'Partner VIP events invitations',
    'Early cash-out at lower minimums',
    'Birthday bonus (5000 pts)'
  ]
WHERE slug = 'platinum';