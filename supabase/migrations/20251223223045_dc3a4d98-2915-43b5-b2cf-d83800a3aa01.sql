-- Insert Zambian Mobile Money rewards
INSERT INTO rewards (name, description, category, points_cost, stock, is_active, image) VALUES
-- Mobile Money
('K50 MTN MoMo', 'Direct transfer to your MTN Mobile Money wallet', 'Mobile Money', 500, 100, true, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'),
('K100 MTN MoMo', 'Direct transfer to your MTN Mobile Money wallet', 'Mobile Money', 1000, 80, true, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'),
('K50 Airtel Money', 'Direct transfer to your Airtel Money wallet', 'Mobile Money', 500, 100, true, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'),
('K100 Airtel Money', 'Direct transfer to your Airtel Money wallet', 'Mobile Money', 1000, 80, true, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'),
('K50 Zamtel Kwacha', 'Direct transfer to your Zamtel Kwacha wallet', 'Mobile Money', 500, 100, true, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'),

-- Airtime
('K20 MTN Airtime', 'MTN Zambia airtime top-up', 'Airtime', 200, 200, true, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),
('K50 MTN Airtime', 'MTN Zambia airtime top-up', 'Airtime', 500, 150, true, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),
('K20 Airtel Airtime', 'Airtel Zambia airtime top-up', 'Airtime', 200, 200, true, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),
('K50 Airtel Airtime', 'Airtel Zambia airtime top-up', 'Airtime', 500, 150, true, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),
('K20 Zamtel Airtime', 'Zamtel airtime top-up', 'Airtime', 200, 200, true, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),

-- Shopping Vouchers
('K100 Shoprite Voucher', 'Redeemable at any Shoprite store in Zambia', 'Shopping', 1000, 50, true, 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400'),
('K200 Shoprite Voucher', 'Redeemable at any Shoprite store in Zambia', 'Shopping', 2000, 30, true, 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400'),
('K100 Pick n Pay Voucher', 'Redeemable at Pick n Pay stores', 'Shopping', 1000, 50, true, 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400'),
('K200 Game Voucher', 'Redeemable at Game stores nationwide', 'Shopping', 2000, 30, true, 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400'),

-- Food
('K50 Hungry Lion Meal', 'Combo meal at Hungry Lion', 'Food', 500, 100, true, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400'),
('K100 Debonairs Pizza', 'Medium pizza voucher at Debonairs', 'Food', 1000, 60, true, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'),
('K150 Steers Voucher', 'Meal voucher at Steers', 'Food', 1500, 40, true, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'),
('K200 Ocean Basket Voucher', 'Dining voucher at Ocean Basket', 'Food', 2000, 25, true, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400');

-- Deactivate old US-oriented rewards
UPDATE rewards SET is_active = false WHERE name LIKE '%Amazon%' OR name LIKE '%PayPal%' OR name LIKE '$%';