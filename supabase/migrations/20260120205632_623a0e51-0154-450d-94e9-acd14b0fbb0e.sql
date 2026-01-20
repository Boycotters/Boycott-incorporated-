-- Add more redeemable items with proper pricing

-- More Avatar Frames (150 pts each)
INSERT INTO public.rewards (name, description, points_cost, category, image, stock, is_active) VALUES
('Golden Crown Frame', 'A majestic golden crown frame for your avatar', 150, 'digital', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 1000, true),
('Neon Glow Frame', 'Vibrant neon border that makes your profile pop', 150, 'digital', 'https://images.unsplash.com/photo-1579547945413-497e1b99dac0?w=400', 1000, true),
('Diamond Sparkle Frame', 'Elegant diamond-studded frame design', 180, 'digital', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400', 1000, true),
('Sunset Gradient Frame', 'Beautiful orange to pink gradient frame', 120, 'digital', 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400', 1000, true),
('Electric Blue Frame', 'Cool electric blue animated frame', 150, 'digital', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400', 1000, true),
('Nature Green Frame', 'Fresh green leaves border design', 100, 'digital', 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400', 1000, true),
('Galaxy Universe Frame', 'Stars and galaxies cosmic frame', 200, 'digital', 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400', 1000, true),
('Fire Flame Frame', 'Hot fire and flames animated border', 180, 'digital', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400', 1000, true),
('Ice Crystal Frame', 'Cool icy crystal border design', 150, 'digital', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 1000, true),
('Rainbow Pride Frame', 'Colorful rainbow gradient frame', 130, 'digital', 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400', 1000, true);

-- More Badges (100-300 pts each)
INSERT INTO public.rewards (name, description, points_cost, category, image, stock, is_active) VALUES
('Early Bird Badge', 'For completing tasks before 8 AM', 100, 'digital', 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=400', 1000, true),
('Night Owl Badge', 'For those who earn at night', 100, 'digital', 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?w=400', 1000, true),
('Survey Master Badge', 'Complete 10 surveys milestone', 150, 'digital', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400', 1000, true),
('Video Watcher Badge', 'Watch 50 videos achievement', 120, 'digital', 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400', 1000, true),
('Game Champion Badge', 'Win 20 games milestone', 200, 'digital', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', 1000, true),
('Referral King Badge', 'Refer 5 friends badge', 250, 'digital', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400', 1000, true),
('Streak Legend Badge', 'Maintain 30-day streak', 300, 'digital', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400', 1000, true),
('First Timer Badge', 'Complete your first task', 50, 'digital', 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400', 1000, true),
('VIP Member Badge', 'Exclusive VIP status badge', 500, 'digital', 'https://images.unsplash.com/photo-1553531384-411a247ccd73?w=400', 1000, true),
('Zambian Pride Badge', 'Proud Zambian user badge', 100, 'digital', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 1000, true);

-- Data Bundles with proper pricing (1.5GB = 150 pts = K10)
INSERT INTO public.rewards (name, description, points_cost, category, image, stock, is_active) VALUES
('1.5GB Airtel Data', '7-day Airtel data bundle (K10 value)', 150, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 500, true),
('1.5GB MTN Data', '7-day MTN data bundle (K10 value)', 150, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 500, true),
('1.5GB Zamtel Data', '7-day Zamtel data bundle (K10 value)', 150, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 500, true),
('3GB Airtel Data', '14-day Airtel bundle (K20 value)', 300, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 500, true),
('3GB MTN Data', '14-day MTN bundle (K20 value)', 300, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 500, true),
('5GB Airtel Data', '30-day Airtel bundle (K35 value)', 525, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 300, true),
('5GB MTN Data', '30-day MTN bundle (K35 value)', 525, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 300, true),
('10GB Mega Bundle', '30-day any network (K60 value)', 900, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 200, true);

-- Airtime with proper pricing (K15 = 225 pts)
INSERT INTO public.rewards (name, description, points_cost, category, image, stock, is_active) VALUES
('K10 MTN Airtime', 'MTN airtime top-up', 150, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 500, true),
('K10 Airtel Airtime', 'Airtel airtime top-up', 150, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 500, true),
('K10 Zamtel Airtime', 'Zamtel airtime top-up', 150, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 500, true),
('K25 MTN Airtime', 'MTN airtime top-up', 375, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 300, true),
('K25 Airtel Airtime', 'Airtel airtime top-up', 375, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 300, true),
('K50 Any Network', 'Airtime for any network', 750, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 200, true);