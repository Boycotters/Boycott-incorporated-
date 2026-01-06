-- Create user_game_plays table to track game plays and limit daily plays
CREATE TABLE public.user_game_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('spin_wheel', 'memory_match', 'scratch_card', 'keepy_uppy')),
  points_earned INTEGER NOT NULL DEFAULT 0,
  score INTEGER DEFAULT NULL,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create index for querying user's plays efficiently
CREATE INDEX idx_user_game_plays_user_id ON public.user_game_plays(user_id);
CREATE INDEX idx_user_game_plays_played_at ON public.user_game_plays(played_at);
CREATE INDEX idx_user_game_plays_game_type ON public.user_game_plays(game_type);

-- Enable RLS
ALTER TABLE public.user_game_plays ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own game plays"
ON public.user_game_plays FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game plays"
ON public.user_game_plays FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to play a game and award points
CREATE OR REPLACE FUNCTION public.play_game(
  p_user_id UUID,
  p_game_type TEXT,
  p_points_earned INTEGER,
  p_score INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit INTEGER := 3;
  v_plays_today INTEGER;
  v_result JSON;
BEGIN
  -- Count how many times user played this game today
  SELECT COUNT(*) INTO v_plays_today
  FROM user_game_plays
  WHERE user_id = p_user_id
    AND game_type = p_game_type
    AND played_at >= CURRENT_DATE;
  
  -- Check daily limit
  IF v_plays_today >= v_daily_limit THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You have reached your daily limit for this game. Come back tomorrow!',
      'plays_remaining', 0
    );
  END IF;
  
  -- Record the game play
  INSERT INTO user_game_plays (user_id, game_type, points_earned, score)
  VALUES (p_user_id, p_game_type, p_points_earned, p_score);
  
  -- Award points to user
  UPDATE users SET total_points = COALESCE(total_points, 0) + p_points_earned
  WHERE id = p_user_id;
  
  -- Update wallet
  UPDATE wallets SET available_points = COALESCE(available_points, 0) + p_points_earned
  WHERE user_id = p_user_id;
  
  -- Create transaction record
  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'game_reward', p_points_earned, 
          CASE p_game_type 
            WHEN 'spin_wheel' THEN 'Spin the Wheel reward'
            WHEN 'memory_match' THEN 'Memory Match reward'
            WHEN 'scratch_card' THEN 'Scratch Card reward'
            WHEN 'keepy_uppy' THEN 'Keepy Uppy reward'
          END,
          'completed');
  
  RETURN json_build_object(
    'success', true,
    'message', 'Game completed! Points awarded.',
    'points_earned', p_points_earned,
    'plays_remaining', v_daily_limit - v_plays_today - 1
  );
END;
$$;

-- Function to get remaining plays for each game
CREATE OR REPLACE FUNCTION public.get_game_plays_remaining(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit INTEGER := 3;
  v_spin_plays INTEGER;
  v_memory_plays INTEGER;
  v_scratch_plays INTEGER;
  v_keepy_plays INTEGER;
BEGIN
  SELECT COALESCE(COUNT(*), 0) INTO v_spin_plays
  FROM user_game_plays
  WHERE user_id = p_user_id AND game_type = 'spin_wheel' AND played_at >= CURRENT_DATE;
  
  SELECT COALESCE(COUNT(*), 0) INTO v_memory_plays
  FROM user_game_plays
  WHERE user_id = p_user_id AND game_type = 'memory_match' AND played_at >= CURRENT_DATE;
  
  SELECT COALESCE(COUNT(*), 0) INTO v_scratch_plays
  FROM user_game_plays
  WHERE user_id = p_user_id AND game_type = 'scratch_card' AND played_at >= CURRENT_DATE;
  
  SELECT COALESCE(COUNT(*), 0) INTO v_keepy_plays
  FROM user_game_plays
  WHERE user_id = p_user_id AND game_type = 'keepy_uppy' AND played_at >= CURRENT_DATE;
  
  RETURN json_build_object(
    'spin_wheel', v_daily_limit - v_spin_plays,
    'memory_match', v_daily_limit - v_memory_plays,
    'scratch_card', v_daily_limit - v_scratch_plays,
    'keepy_uppy', v_daily_limit - v_keepy_plays
  );
END;
$$;