-- Deactivate mobile money and airtime rewards
UPDATE rewards SET is_active = false WHERE category IN ('Mobile Money', 'Airtime');

-- Insert innovative Zambian rewards
INSERT INTO rewards (name, description, category, points_cost, stock, is_active, image) VALUES
-- Data Bundles
('1GB MTN Data', '7-day MTN data bundle', 'Data Bundles', 300, 200, true, 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400'),
('5GB MTN Data', '30-day MTN data bundle', 'Data Bundles', 800, 150, true, 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400'),
('1GB Airtel Data', '7-day Airtel data bundle', 'Data Bundles', 300, 200, true, 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400'),
('5GB Airtel Data', '30-day Airtel data bundle', 'Data Bundles', 800, 150, true, 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400'),
('10GB Zamtel Data', '30-day unlimited night bundle included', 'Data Bundles', 1200, 100, true, 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400'),

-- Discounts & Deals
('20% Off Shoprite', 'One-time 20% discount on next purchase', 'Discounts', 400, 100, true, 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400'),
('15% Off Game Stores', 'Electronics & appliances discount', 'Discounts', 350, 80, true, 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400'),
('Buy 1 Get 1 Free Pizza', 'Debonairs BOGO deal', 'Discounts', 600, 50, true, 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400'),
('50% Off Uber Ride', 'Valid for one ride in Lusaka', 'Discounts', 250, 150, true, 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400'),

-- Entertainment & Streaming
('1 Week Netflix', 'Netflix streaming access', 'Entertainment', 500, 80, true, 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400'),
('1 Month Spotify', 'Spotify Premium subscription', 'Entertainment', 600, 70, true, 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'),
('DStv Access Weekly', 'One week DStv Access bouquet', 'Entertainment', 400, 100, true, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400'),
('Showmax 1 Month', 'Full Showmax streaming access', 'Entertainment', 700, 60, true, 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400'),

-- Transport & Fuel
('K50 Puma Fuel', 'Fuel voucher at Puma stations', 'Transport', 500, 80, true, 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400'),
('K100 Total Fuel', 'Fuel voucher at Total stations', 'Transport', 1000, 50, true, 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400'),
('Ulendo Bus Discount', '30% off inter-city bus ticket', 'Transport', 350, 100, true, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400'),

-- Gaming & Digital
('K50 PlayStation Credit', 'PSN wallet top-up', 'Gaming', 600, 40, true, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400'),
('Free Fire Diamonds', '100 diamonds top-up', 'Gaming', 300, 100, true, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'),
('PUBG UC Pack', '60 UC for PUBG Mobile', 'Gaming', 350, 100, true, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'),

-- Health & Wellness
('Gym Day Pass', 'Single day access to partner gyms', 'Wellness', 400, 60, true, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
('Pharmacy Discount 15%', 'One-time discount at Link Pharmacy', 'Wellness', 300, 80, true, 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400'),

-- Education
('Coursera 1 Month', 'Access to online courses', 'Education', 800, 50, true, 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400'),
('Skillshare Premium', '1 month creative learning', 'Education', 700, 50, true, 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400');