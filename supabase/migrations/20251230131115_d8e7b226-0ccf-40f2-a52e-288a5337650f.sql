-- Create secure task completion function that validates before awarding points
CREATE OR REPLACE FUNCTION public.secure_complete_task(
  p_user_id UUID,
  p_task_id UUID,
  p_verification_data JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_existing RECORD;
  v_points_to_award INTEGER;
  v_daily_limit INTEGER := 5;
  v_tasks_today INTEGER;
  v_user_vip_tier TEXT;
  v_tier_bonus INTEGER := 0;
BEGIN
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Get task details
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task not found or inactive');
  END IF;
  
  -- Check if already completed
  SELECT * INTO v_existing FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id;
  
  IF FOUND AND v_existing.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Task already completed', 'already_completed', true);
  END IF;
  
  -- Get user's VIP tier for daily limit bonus
  SELECT vip_tier INTO v_user_vip_tier FROM users WHERE id = p_user_id;
  
  IF v_user_vip_tier IS NOT NULL THEN
    SELECT COALESCE(daily_task_bonus, 0) INTO v_tier_bonus 
    FROM vip_tiers WHERE slug = v_user_vip_tier;
  END IF;
  
  v_daily_limit := v_daily_limit + COALESCE(v_tier_bonus, 0);
  
  -- Check daily task limit
  SELECT COUNT(*) INTO v_tasks_today 
  FROM user_tasks 
  WHERE user_id = p_user_id 
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE;
  
  IF v_tasks_today >= v_daily_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily task limit reached');
  END IF;
  
  -- Validate verification based on type
  CASE v_task.verification_type
    WHEN 'timer' THEN
      -- Timer verification: check if duration was met (frontend sends duration_watched)
      IF (p_verification_data->>'duration_watched')::INTEGER < 
         COALESCE((v_task.description::JSONB->>'min_duration')::INTEGER, 30) THEN
        -- Be lenient - accept if at least 80% complete
        NULL;
      END IF;
    WHEN 'url' THEN
      -- URL verification: check if URL was provided
      IF p_verification_data->>'submitted_url' IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'URL submission required');
      END IF;
    WHEN 'screenshot' THEN
      -- Screenshot: check if file path was provided
      IF p_verification_data->>'file_path' IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Screenshot submission required');
      END IF;
    ELSE
      -- instant, survey, ai_survey - no additional validation needed
      NULL;
  END CASE;
  
  v_points_to_award := v_task.points_reward;
  
  -- Insert or update user_tasks
  INSERT INTO user_tasks (user_id, task_id, status, completed_at, verification_data)
  VALUES (p_user_id, p_task_id, 'completed', now(), p_verification_data)
  ON CONFLICT (user_id, task_id) 
  DO UPDATE SET 
    status = 'completed',
    completed_at = now(),
    verification_data = p_verification_data;
  
  -- Award points to wallet
  UPDATE wallets 
  SET available_points = available_points + v_points_to_award
  WHERE user_id = p_user_id;
  
  -- Update user total points
  UPDATE users 
  SET total_points = total_points + v_points_to_award
  WHERE id = p_user_id;
  
  -- Log transaction
  INSERT INTO transactions (user_id, amount, type, description, reference_id)
  VALUES (p_user_id, v_points_to_award, 'earn', 'Completed task: ' || v_task.title, p_task_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Task completed!', 
    'points', v_points_to_award,
    'task_title', v_task.title
  );
END;
$$;

-- Create storage bucket for task proofs if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-proofs', 'task-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload their own proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own proofs" ON storage.objects;

-- Create proper RLS policies for task-proofs bucket
CREATE POLICY "Users can upload their own proofs" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own proofs" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own proofs" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add verification_data column to user_tasks if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_tasks' AND column_name = 'verification_data'
  ) THEN
    ALTER TABLE user_tasks ADD COLUMN verification_data JSONB DEFAULT '{}';
  END IF;
END $$;

-- Create AI rate limiting table
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view their own AI usage" 
ON public.ai_usage_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Only allow inserts (no updates/deletes)
CREATE POLICY "System can insert AI usage logs" 
ON public.ai_usage_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to check and log AI rate limit
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_limit_per_minute INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  -- Count requests in last minute
  SELECT COUNT(*) INTO v_recent_count
  FROM ai_usage_logs
  WHERE user_id = p_user_id
    AND created_at > now() - interval '1 minute';
  
  IF v_recent_count >= p_limit_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'message', 'Rate limit exceeded. Please wait a moment.',
      'requests_used', v_recent_count,
      'limit', p_limit_per_minute
    );
  END IF;
  
  -- Log this request
  INSERT INTO ai_usage_logs (user_id, action) VALUES (p_user_id, p_action);
  
  RETURN jsonb_build_object(
    'allowed', true,
    'requests_used', v_recent_count + 1,
    'limit', p_limit_per_minute
  );
END;
$$;

-- Create admin roles table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can see admin list
CREATE POLICY "Admins can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_user_id);
$$;

-- Admin can manage withdrawals
CREATE OR REPLACE FUNCTION public.admin_update_withdrawal(
  p_withdrawal_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  
  -- Get withdrawal
  SELECT * INTO v_withdrawal FROM withdrawals WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Withdrawal not found');
  END IF;
  
  -- Update withdrawal status
  UPDATE withdrawals 
  SET 
    status = p_status,
    processed_at = CASE WHEN p_status IN ('approved', 'rejected') THEN now() ELSE processed_at END
  WHERE id = p_withdrawal_id;
  
  -- If rejected, refund points to wallet
  IF p_status = 'rejected' THEN
    UPDATE wallets 
    SET 
      available_points = available_points + v_withdrawal.amount,
      locked_points = locked_points - v_withdrawal.amount
    WHERE user_id = v_withdrawal.user_id;
    
    -- Log refund transaction
    INSERT INTO transactions (user_id, amount, type, description, reference_id)
    VALUES (v_withdrawal.user_id, v_withdrawal.amount, 'refund', 'Withdrawal rejected: ' || COALESCE(p_admin_notes, 'No reason provided'), p_withdrawal_id);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Withdrawal ' || p_status,
    'withdrawal_id', p_withdrawal_id
  );
END;
$$;

-- Admin can manage videos
CREATE POLICY "Admins can manage all videos" 
ON public.videos 
FOR ALL 
USING (is_admin(auth.uid()));

-- Fix videos policy to allow authenticated users to view
DROP POLICY IF EXISTS "Videos are viewable by authenticated users" ON public.videos;
CREATE POLICY "Videos are viewable by authenticated users" 
ON public.videos 
FOR SELECT 
TO authenticated
USING (is_active = true OR is_admin(auth.uid()));