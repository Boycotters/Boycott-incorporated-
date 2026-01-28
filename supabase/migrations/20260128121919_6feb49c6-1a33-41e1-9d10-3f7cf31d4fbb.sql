-- Fix the game_type constraint to include 'basketball' instead of 'scratch_card'
ALTER TABLE public.user_game_plays DROP CONSTRAINT IF EXISTS user_game_plays_game_type_check;

ALTER TABLE public.user_game_plays 
ADD CONSTRAINT user_game_plays_game_type_check 
CHECK (game_type = ANY (ARRAY['spin_wheel'::text, 'memory_match'::text, 'basketball'::text, 'keepy_uppy'::text]));