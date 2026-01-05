-- Add more videos to the Watch & Earn section
INSERT INTO public.videos (title, description, video_url, thumbnail_url, duration_seconds, points_reward, category, source, partner_name, is_active) VALUES
-- Educational content
('Money Management 101', 'Learn smart ways to manage your Kwacha and grow your savings', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', NULL, 60, 20, 'education', 'admin', NULL, true),
('Mobile Money Tips', 'How to use Airtel Money, MTN MoMo and Zamtel Kwacha safely', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', NULL, 45, 15, 'education', 'admin', NULL, true),
('Side Hustle Ideas Zambia', 'Creative ways Zambians are making extra income in 2026', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', NULL, 55, 18, 'lifestyle', 'admin', NULL, true),

-- Partner content
('Shop Smart with Shoprite', 'Discover weekly deals and loyalty rewards at Shoprite Zambia', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', NULL, 25, 10, 'partner', 'partner', 'Shoprite', true),
('MTN Zambia Deals', 'Get more data and airtime with MTN promotions', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', NULL, 30, 12, 'partner', 'partner', 'MTN Zambia', true),
('Airtel Money Features', 'Send, receive, and pay bills with Airtel Money', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', NULL, 35, 15, 'partner', 'partner', 'Airtel', true),

-- Entertainment
('Top 10 Zambian Music 2026', 'Hottest Zambian songs trending right now', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', NULL, 40, 8, 'entertainment', 'admin', NULL, true),
('Lusaka City Tour', 'Explore the beautiful capital city of Zambia', 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', NULL, 50, 12, 'entertainment', 'admin', NULL, true),
('Zambian Food Adventures', 'Traditional and modern Zambian cuisine you must try', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', NULL, 35, 10, 'lifestyle', 'admin', NULL, true),

-- Tutorial content for the app
('Maximize Your Points', 'Expert tips to earn more points faster on Pesa Rewards', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', NULL, 40, 20, 'tutorial', 'admin', NULL, true),
('VIP Tier Benefits Explained', 'Learn what each VIP tier unlocks and how to level up', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', NULL, 30, 15, 'tutorial', 'admin', NULL, true),
('Referral Program Guide', 'How to invite friends and earn bonus points together', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', NULL, 25, 12, 'tutorial', 'admin', NULL, true);