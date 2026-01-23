-- 1. Add missing expires_at column to user_inventory
ALTER TABLE public.user_inventory ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Add is_banned columns to users table for ban/suspend functionality
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_by UUID;

-- 3. Create daily limits tracking table if not exists
CREATE TABLE IF NOT EXISTS public.daily_activity_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ai_tasks_completed INTEGER DEFAULT 0,
  surveys_completed INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  regular_tasks_completed INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

-- Enable RLS on table
ALTER TABLE public.daily_activity_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own daily limits" ON public.daily_activity_limits;
DROP POLICY IF EXISTS "System can manage daily limits" ON public.daily_activity_limits;

CREATE POLICY "Users can view their own daily limits" ON public.daily_activity_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage daily limits" ON public.daily_activity_limits
FOR ALL USING (true) WITH CHECK (true);

-- 4. Drop existing functions to recreate with correct signatures
DROP FUNCTION IF EXISTS public.check_daily_activity_limit(uuid, text, integer);
DROP FUNCTION IF EXISTS public.increment_daily_activity(uuid, text, integer);
DROP FUNCTION IF EXISTS public.get_daily_activity_status(uuid);

-- 5. Create function to check daily activity limits
CREATE OR REPLACE FUNCTION public.check_daily_activity_limit(
  p_user_id UUID,
  p_activity_type TEXT,
  p_points_amount INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit RECORD;
  v_max_ai_tasks INTEGER := 3;
  v_max_surveys INTEGER := 3;
  v_max_videos INTEGER := 4;
  v_max_games INTEGER := 4;
  v_max_regular_tasks INTEGER := 2;
  v_max_daily_points INTEGER := 180;
  v_current_limit INTEGER;
  v_max_limit INTEGER;
BEGIN
  -- Get or create today's limits record
  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  
  SELECT * INTO v_limit FROM daily_activity_limits 
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  -- Determine which limit to check
  CASE p_activity_type
    WHEN 'ai_task' THEN
      v_current_limit := COALESCE(v_limit.ai_tasks_completed, 0);
      v_max_limit := v_max_ai_tasks;
    WHEN 'survey' THEN
      v_current_limit := COALESCE(v_limit.surveys_completed, 0);
      v_max_limit := v_max_surveys;
    WHEN 'video' THEN
      v_current_limit := COALESCE(v_limit.videos_watched, 0);
      v_max_limit := v_max_videos;
    WHEN 'game' THEN
      v_current_limit := COALESCE(v_limit.games_played, 0);
      v_max_limit := v_max_games;
    WHEN 'regular_task' THEN
      v_current_limit := COALESCE(v_limit.regular_tasks_completed, 0);
      v_max_limit := v_max_regular_tasks;
    ELSE
      RETURN json_build_object('allowed', false, 'message', 'Invalid activity type');
  END CASE;
  
  -- Check daily points cap
  IF COALESCE(v_limit.total_points_earned, 0) + p_points_amount > v_max_daily_points THEN
    RETURN json_build_object(
      'allowed', false,
      'message', 'Daily points limit of ' || v_max_daily_points || ' reached',
      'current_points', COALESCE(v_limit.total_points_earned, 0),
      'max_points', v_max_daily_points
    );
  END IF;
  
  -- Check activity limit
  IF v_current_limit >= v_max_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'message', 'Daily limit for ' || p_activity_type || ' reached (' || v_max_limit || ')',
      'current', v_current_limit,
      'max', v_max_limit
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'current', v_current_limit,
    'max', v_max_limit,
    'remaining', v_max_limit - v_current_limit,
    'points_remaining', v_max_daily_points - COALESCE(v_limit.total_points_earned, 0)
  );
END;
$$;

-- 6. Create function to increment daily activity
CREATE OR REPLACE FUNCTION public.increment_daily_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_points_amount INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO daily_activity_limits (user_id, activity_date, total_points_earned)
  VALUES (p_user_id, CURRENT_DATE, p_points_amount)
  ON CONFLICT (user_id, activity_date) 
  DO UPDATE SET 
    total_points_earned = daily_activity_limits.total_points_earned + p_points_amount,
    updated_at = now();
  
  -- Update specific activity counter
  CASE p_activity_type
    WHEN 'ai_task' THEN
      UPDATE daily_activity_limits 
      SET ai_tasks_completed = ai_tasks_completed + 1
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    WHEN 'survey' THEN
      UPDATE daily_activity_limits 
      SET surveys_completed = surveys_completed + 1
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    WHEN 'video' THEN
      UPDATE daily_activity_limits 
      SET videos_watched = videos_watched + 1
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    WHEN 'game' THEN
      UPDATE daily_activity_limits 
      SET games_played = games_played + 1
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    WHEN 'regular_task' THEN
      UPDATE daily_activity_limits 
      SET regular_tasks_completed = regular_tasks_completed + 1
      WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  END CASE;
END;
$$;

-- 7. Create function to get daily activity status
CREATE OR REPLACE FUNCTION public.get_daily_activity_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit RECORD;
BEGIN
  -- Get or create today's limits record
  INSERT INTO daily_activity_limits (user_id, activity_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, activity_date) DO NOTHING;
  
  SELECT * INTO v_limit FROM daily_activity_limits 
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  RETURN json_build_object(
    'ai_tasks', json_build_object('completed', COALESCE(v_limit.ai_tasks_completed, 0), 'max', 3, 'remaining', 3 - COALESCE(v_limit.ai_tasks_completed, 0)),
    'surveys', json_build_object('completed', COALESCE(v_limit.surveys_completed, 0), 'max', 3, 'remaining', 3 - COALESCE(v_limit.surveys_completed, 0)),
    'videos', json_build_object('completed', COALESCE(v_limit.videos_watched, 0), 'max', 4, 'remaining', 4 - COALESCE(v_limit.videos_watched, 0)),
    'games', json_build_object('completed', COALESCE(v_limit.games_played, 0), 'max', 4, 'remaining', 4 - COALESCE(v_limit.games_played, 0)),
    'regular_tasks', json_build_object('completed', COALESCE(v_limit.regular_tasks_completed, 0), 'max', 2, 'remaining', 2 - COALESCE(v_limit.regular_tasks_completed, 0)),
    'total_points', json_build_object('earned', COALESCE(v_limit.total_points_earned, 0), 'max', 180, 'remaining', 180 - COALESCE(v_limit.total_points_earned, 0))
  );
END;
$$;

-- 8. Create admin ban user function
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id UUID,
  p_ban_reason TEXT DEFAULT NULL,
  p_is_banned BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_admin_id) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;
  
  UPDATE users
  SET 
    is_banned = p_is_banned,
    ban_reason = CASE WHEN p_is_banned THEN p_ban_reason ELSE NULL END,
    banned_at = CASE WHEN p_is_banned THEN now() ELSE NULL END,
    banned_by = CASE WHEN p_is_banned THEN v_admin_id ELSE NULL END
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', CASE WHEN p_is_banned THEN 'User has been banned' ELSE 'User has been unbanned' END
  );
END;
$$;

-- 9. Fix redeem_reward function
CREATE OR REPLACE FUNCTION public.redeem_reward(p_user_id UUID, p_reward_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward RECORD;
  v_wallet RECORD;
  v_redemption_id UUID;
  v_item_type TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true;
  
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Reward not found or inactive');
  END IF;
  
  IF v_reward.stock <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'This reward is out of stock');
  END IF;
  
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_wallet IS NULL OR v_wallet.available_points < v_reward.points_cost THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient points');
  END IF;
  
  UPDATE wallets
  SET available_points = available_points - v_reward.points_cost
  WHERE user_id = p_user_id;
  
  UPDATE rewards SET stock = stock - 1 WHERE id = p_reward_id;
  
  INSERT INTO redemptions (user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, 'completed')
  RETURNING id INTO v_redemption_id;
  
  IF v_reward.name ILIKE '%frame%' THEN
    v_item_type := 'avatar_frame';
  ELSIF v_reward.name ILIKE '%badge%' THEN
    v_item_type := 'badge';
  ELSIF v_reward.name ILIKE '%theme%' THEN
    v_item_type := 'theme';
  ELSE
    v_item_type := 'item';
  END IF;
  
  IF v_reward.category = 'digital' THEN
    v_expires_at := now() + interval '30 days';
  ELSE
    v_expires_at := NULL;
  END IF;
  
  IF v_reward.category = 'digital' OR v_reward.name ILIKE '%frame%' OR v_reward.name ILIKE '%badge%' THEN
    INSERT INTO user_inventory (user_id, reward_id, item_type, redemption_id, expires_at)
    VALUES (p_user_id, p_reward_id, v_item_type, v_redemption_id, v_expires_at);
  END IF;
  
  INSERT INTO transactions (user_id, type, points_amount, description, status)
  VALUES (p_user_id, 'redemption', -v_reward.points_cost, 'Redeemed: ' || v_reward.name, 'completed');
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Reward redeemed successfully',
    'reward_name', v_reward.name,
    'points_spent', v_reward.points_cost
  );
END;
$$;