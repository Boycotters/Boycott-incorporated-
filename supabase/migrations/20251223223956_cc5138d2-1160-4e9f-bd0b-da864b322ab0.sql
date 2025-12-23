-- Deactivate bus discount
UPDATE rewards SET is_active = false WHERE name = 'Ulendo Bus Discount';

-- Replace Uber with Yango
UPDATE rewards SET name = '50% Off Yango Ride', description = 'Valid for one ride in Lusaka' WHERE name = '50% Off Uber Ride';