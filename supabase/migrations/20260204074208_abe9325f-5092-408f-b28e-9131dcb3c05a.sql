-- Add more essential Zambian marketplace items
-- First, let's delete game-related rewards and add practical items

-- Delete game card rewards
DELETE FROM rewards WHERE name ILIKE '%game card%' OR name ILIKE '%steam%' OR name ILIKE '%playstation%' OR name ILIKE '%xbox%' OR name ILIKE '%nintendo%';

-- Insert essential Zambian items
INSERT INTO rewards (name, description, points_cost, category, image, stock, is_active) VALUES
-- Airtime options
('K5 MTN Airtime', 'Small MTN airtime top-up for quick calls', 75, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 999, true),
('K5 Airtel Airtime', 'Small Airtel airtime top-up for quick calls', 75, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 999, true),
('K5 Zamtel Airtime', 'Small Zamtel airtime top-up for quick calls', 75, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 999, true),
('K20 MTN Airtime', 'MTN airtime for calls and SMS', 250, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 999, true),
('K20 Airtel Airtime', 'Airtel airtime for calls and SMS', 250, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 999, true),
('K50 MTN Airtime', 'Large MTN airtime bundle', 550, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 999, true),
('K50 Airtel Airtime', 'Large Airtel airtime bundle', 550, 'Airtime', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 999, true),

-- Data bundles
('500MB MTN Daily Data', '24-hour MTN data bundle', 80, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 999, true),
('500MB Airtel Daily Data', '24-hour Airtel data bundle', 80, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 999, true),
('3GB MTN Weekly Data', '7-day MTN data bundle (K20 value)', 250, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 999, true),
('3GB Airtel Weekly Data', '7-day Airtel data bundle (K20 value)', 250, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 999, true),
('5GB MTN Monthly Data', '30-day MTN data bundle (K35 value)', 400, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 999, true),
('5GB Airtel Monthly Data', '30-day Airtel data bundle (K35 value)', 400, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 999, true),
('10GB MTN Data Bundle', 'Large monthly MTN data bundle', 700, 'Data Bundles', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 999, true),

-- Electricity/ZESCO
('K20 ZESCO Units', 'Pre-paid electricity units', 250, 'Utilities', 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400', 999, true),
('K50 ZESCO Units', 'Pre-paid electricity units', 550, 'Utilities', 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400', 999, true),
('K100 ZESCO Units', 'Large pre-paid electricity bundle', 1050, 'Utilities', 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400', 999, true),

-- Shopping Vouchers
('K20 Shoprite Voucher', 'Grocery shopping voucher', 250, 'Shopping', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', 500, true),
('K50 Shoprite Voucher', 'Grocery shopping voucher', 550, 'Shopping', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', 500, true),
('K20 Pick n Pay Voucher', 'Grocery shopping voucher', 250, 'Shopping', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', 500, true),
('K50 Pick n Pay Voucher', 'Grocery shopping voucher', 550, 'Shopping', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', 500, true),
('K100 Spar Voucher', 'Large grocery shopping voucher', 1050, 'Shopping', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', 500, true),

-- TV Subscriptions
('DStv Access 1 Week', 'DStv Access bouquet for 7 days', 300, 'Entertainment', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', 200, true),
('GOtv Lite 1 Week', 'GOtv Lite package for 7 days', 180, 'Entertainment', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', 200, true),
('GOtv Max 1 Week', 'GOtv Max package for 7 days', 350, 'Entertainment', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', 200, true),
('DStv Compact 1 Week', 'DStv Compact bouquet for 7 days', 500, 'Entertainment', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', 200, true),

-- Transport
('K10 Ulendo Ride Credit', 'Taxi ride credit for local transport', 130, 'Transport', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400', 300, true),
('K25 Ulendo Ride Credit', 'Taxi ride credit for longer trips', 300, 'Transport', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400', 300, true),

-- Educational
('K20 School Supplies Voucher', 'For notebooks, pens, and supplies', 250, 'Education', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400', 300, true),
('K50 School Supplies Voucher', 'Larger school supplies package', 550, 'Education', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400', 300, true)
ON CONFLICT (id) DO NOTHING;