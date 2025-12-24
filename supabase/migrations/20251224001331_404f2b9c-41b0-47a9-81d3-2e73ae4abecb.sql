-- Add streak milestone tracking and bonuses
-- Milestones: 7 days = 50 pts, 14 days = 100 pts, 30 days = 250 pts

-- Create milestone tracking table
CREATE TABLE IF NOT EXISTS public.streak_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_days integer NOT NULL,
  bonus_points integer NOT NULL,
  claimed_at timestamp without time zone DEFAULT now(),
  UNIQUE(user_id, milestone_days)
);

-- Enable RLS
ALTER TABLE public.streak_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own milestones" ON public.streak_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones" ON public.streak_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to check and award streak milestones
CREATE OR REPLACE FUNCTION public.check_streak_milestones(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_streak integer;
  milestone_record RECORD;
  awarded_milestones json[] := '{}';
  total_bonus integer := 0;
  milestones integer[] := ARRAY[7, 14, 30];
  bonus_amounts integer[] := ARRAY[50, 100, 250];
  i integer;
BEGIN
  -- Get user's current streak
  SELECT current_streak INTO user_streak FROM users WHERE id = p_user_id;
  
  IF user_streak IS NULL THEN
    RETURN json_build_object('milestones_awarded', '[]'::json, 'total_bonus', 0);
  END IF;
  
  -- Check each milestone
  FOR i IN 1..array_length(milestones, 1) LOOP
    IF user_streak >= milestones[i] THEN
      -- Check if milestone already claimed
      IF NOT EXISTS (
        SELECT 1 FROM streak_milestones 
        WHERE user_id = p_user_id AND milestone_days = milestones[i]
      ) THEN
        -- Award milestone
        INSERT INTO streak_milestones (user_id, milestone_days, bonus_points)
        VALUES (p_user_id, milestones[i], bonus_amounts[i]);
        
        -- Add bonus points to wallet
        UPDATE wallets SET available_points = available_points + bonus_amounts[i]
        WHERE wallets.user_id = p_user_id;
        
        -- Update user total points
        UPDATE users SET total_points = total_points + bonus_amounts[i]
        WHERE id = p_user_id;
        
        -- Record transaction
        INSERT INTO transactions (user_id, type, points_amount, description, status)
        VALUES (p_user_id, 'streak_milestone', bonus_amounts[i], 
                milestones[i] || ' day streak milestone bonus!', 'completed');
        
        awarded_milestones := awarded_milestones || json_build_object(
          'days', milestones[i],
          'bonus', bonus_amounts[i]
        );
        total_bonus := total_bonus + bonus_amounts[i];
      END IF;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'milestones_awarded', to_json(awarded_milestones),
    'total_bonus', total_bonus
  );
END;
$$;