-- Create game achievements table
CREATE TABLE public.game_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  icon VARCHAR NOT NULL,
  game_type VARCHAR, -- NULL means applies to all games
  requirement_type VARCHAR NOT NULL, -- 'score', 'total_games', 'high_score', 'streak'
  requirement_value INTEGER NOT NULL,
  points_reward INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Create user game achievements table
CREATE TABLE public.user_game_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.game_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create game tournaments table
CREATE TABLE public.game_tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  game_type VARCHAR NOT NULL, -- 'keepy_uppy', 'basketball', 'memory_match', 'spin_wheel'
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  entry_fee INTEGER DEFAULT 0,
  prize_pool INTEGER NOT NULL DEFAULT 500,
  max_participants INTEGER DEFAULT 100,
  status VARCHAR DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tournament participants table
CREATE TABLE public.tournament_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.game_tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  best_score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  rank INTEGER,
  prize_won INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.game_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active game achievements" ON public.game_achievements
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own game achievements" ON public.user_game_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view tournaments" ON public.game_tournaments
  FOR SELECT USING (true);

CREATE POLICY "Users can view tournament participants" ON public.tournament_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join tournaments" ON public.tournament_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update play_game function to use basketball instead of scratch_card
CREATE OR REPLACE FUNCTION public.get_game_plays_remaining(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plays_per_game INTEGER := 3;
  spin_plays INTEGER;
  memory_plays INTEGER;
  basketball_plays INTEGER;
  keepy_plays INTEGER;
  today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now() AT TIME ZONE 'UTC');
BEGIN
  -- Count plays for each game type today
  SELECT COUNT(*) INTO spin_plays
  FROM user_game_plays
  WHERE user_id = p_user_id 
    AND game_type = 'spin_wheel'
    AND played_at >= today_start;
    
  SELECT COUNT(*) INTO memory_plays
  FROM user_game_plays
  WHERE user_id = p_user_id 
    AND game_type = 'memory_match'
    AND played_at >= today_start;
    
  SELECT COUNT(*) INTO basketball_plays
  FROM user_game_plays
  WHERE user_id = p_user_id 
    AND game_type = 'basketball'
    AND played_at >= today_start;
    
  SELECT COUNT(*) INTO keepy_plays
  FROM user_game_plays
  WHERE user_id = p_user_id 
    AND game_type = 'keepy_uppy'
    AND played_at >= today_start;
  
  RETURN json_build_object(
    'spin_wheel', GREATEST(0, plays_per_game - spin_plays),
    'memory_match', GREATEST(0, plays_per_game - memory_plays),
    'basketball', GREATEST(0, plays_per_game - basketball_plays),
    'keepy_uppy', GREATEST(0, plays_per_game - keepy_plays)
  );
END;
$$;

-- Create function to get game leaderboard
CREATE OR REPLACE FUNCTION public.get_game_leaderboard(
  p_game_type VARCHAR DEFAULT NULL,
  p_period VARCHAR DEFAULT 'all' -- 'today', 'week', 'month', 'all'
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  full_name VARCHAR,
  total_score BIGINT,
  games_played BIGINT,
  best_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Determine period start
  period_start := CASE p_period
    WHEN 'today' THEN date_trunc('day', now() AT TIME ZONE 'UTC')
    WHEN 'week' THEN date_trunc('week', now() AT TIME ZONE 'UTC')
    WHEN 'month' THEN date_trunc('month', now() AT TIME ZONE 'UTC')
    ELSE '1970-01-01'::TIMESTAMP WITH TIME ZONE
  END;

  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY SUM(ugp.points_earned) DESC) as rank,
    ugp.user_id,
    u.full_name,
    SUM(ugp.points_earned)::BIGINT as total_score,
    COUNT(*)::BIGINT as games_played,
    MAX(ugp.score) as best_score
  FROM user_game_plays ugp
  JOIN users u ON u.id = ugp.user_id
  WHERE ugp.played_at >= period_start
    AND (p_game_type IS NULL OR ugp.game_type = p_game_type)
  GROUP BY ugp.user_id, u.full_name
  ORDER BY total_score DESC
  LIMIT 100;
END;
$$;

-- Create function to join tournament
CREATE OR REPLACE FUNCTION public.join_tournament(
  p_user_id UUID,
  p_tournament_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_participant_count INTEGER;
  v_wallet RECORD;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament FROM game_tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Tournament not found');
  END IF;
  
  -- Check if tournament is active or scheduled
  IF v_tournament.status NOT IN ('scheduled', 'active') THEN
    RETURN json_build_object('success', false, 'message', 'Tournament is not available');
  END IF;
  
  -- Check if already joined
  IF EXISTS (SELECT 1 FROM tournament_participants WHERE tournament_id = p_tournament_id AND user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Already joined this tournament');
  END IF;
  
  -- Check participant limit
  SELECT COUNT(*) INTO v_participant_count FROM tournament_participants WHERE tournament_id = p_tournament_id;
  IF v_participant_count >= v_tournament.max_participants THEN
    RETURN json_build_object('success', false, 'message', 'Tournament is full');
  END IF;
  
  -- Check entry fee
  IF v_tournament.entry_fee > 0 THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;
    IF v_wallet.available_points < v_tournament.entry_fee THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient points for entry fee');
    END IF;
    
    -- Deduct entry fee
    UPDATE wallets SET available_points = available_points - v_tournament.entry_fee WHERE user_id = p_user_id;
  END IF;
  
  -- Join tournament
  INSERT INTO tournament_participants (tournament_id, user_id) VALUES (p_tournament_id, p_user_id);
  
  RETURN json_build_object('success', true, 'message', 'Successfully joined tournament');
END;
$$;

-- Create function to update tournament score
CREATE OR REPLACE FUNCTION public.submit_tournament_score(
  p_user_id UUID,
  p_tournament_id UUID,
  p_score INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament RECORD;
  v_participant RECORD;
BEGIN
  -- Get tournament
  SELECT * INTO v_tournament FROM game_tournaments WHERE id = p_tournament_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Tournament not active');
  END IF;
  
  -- Get participant
  SELECT * INTO v_participant FROM tournament_participants 
  WHERE tournament_id = p_tournament_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Not enrolled in tournament');
  END IF;
  
  -- Update score if better
  UPDATE tournament_participants 
  SET 
    best_score = GREATEST(best_score, p_score),
    attempts = attempts + 1
  WHERE tournament_id = p_tournament_id AND user_id = p_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Score submitted', 'new_best', p_score > v_participant.best_score);
END;
$$;

-- Insert default game achievements
INSERT INTO game_achievements (name, description, icon, game_type, requirement_type, requirement_value, points_reward) VALUES
-- General achievements
('First Timer', 'Play your first mini game', '🎮', NULL, 'total_games', 1, 10),
('Game Enthusiast', 'Play 50 mini games', '🎯', NULL, 'total_games', 50, 100),
('Gaming Pro', 'Play 200 mini games', '🏆', NULL, 'total_games', 200, 300),

-- Keepy Uppy achievements
('Soccer Rookie', 'Score 10 kicks in Keepy Uppy', '⚽', 'keepy_uppy', 'score', 10, 25),
('Soccer Star', 'Score 30 kicks in Keepy Uppy', '⭐', 'keepy_uppy', 'score', 30, 75),
('Soccer Legend', 'Score 50 kicks in Keepy Uppy', '👑', 'keepy_uppy', 'score', 50, 150),

-- Basketball achievements
('Rookie Shooter', 'Score 3 baskets in one game', '🏀', 'basketball', 'score', 3, 25),
('Sharpshooter', 'Score 7 baskets in one game', '🎯', 'basketball', 'score', 7, 75),
('Basketball Star', 'Score 10 baskets in one game', '⭐', 'basketball', 'score', 10, 150),

-- Memory Match achievements
('Good Memory', 'Win Memory Match with less than 20 moves', '🧠', 'memory_match', 'score', 20, 50),
('Perfect Memory', 'Win Memory Match with less than 12 moves', '💫', 'memory_match', 'score', 12, 150),

-- Spin Wheel achievements
('Lucky Spin', 'Win 75+ points on Spin the Wheel', '🎡', 'spin_wheel', 'score', 75, 50),
('Jackpot!', 'Win 100 points on Spin the Wheel', '💰', 'spin_wheel', 'score', 100, 100);

-- Insert a sample scheduled tournament (runs at specific times)
INSERT INTO game_tournaments (name, description, game_type, start_time, end_time, entry_fee, prize_pool, max_participants, status) VALUES
('Weekend Keepy Uppy Challenge', 'Show off your soccer skills and win big!', 'keepy_uppy', 
 (date_trunc('week', now()) + INTERVAL '5 days 10:00:00')::TIMESTAMP WITH TIME ZONE,
 (date_trunc('week', now()) + INTERVAL '5 days 22:00:00')::TIMESTAMP WITH TIME ZONE,
 50, 1000, 50, 'scheduled'),
('Basketball Shootout', 'Swish your way to victory!', 'basketball',
 (date_trunc('week', now()) + INTERVAL '6 days 14:00:00')::TIMESTAMP WITH TIME ZONE,
 (date_trunc('week', now()) + INTERVAL '6 days 20:00:00')::TIMESTAMP WITH TIME ZONE,
 25, 500, 100, 'scheduled');