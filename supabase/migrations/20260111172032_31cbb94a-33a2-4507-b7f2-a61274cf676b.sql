-- Add admin user
INSERT INTO public.admin_users (user_id, role)
VALUES ('a792efdf-63f9-4c36-bb88-4188dcbbed7d', 'admin')
ON CONFLICT DO NOTHING;