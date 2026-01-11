-- Create survey_responses table for data monetization
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  survey_id TEXT NOT NULL,
  survey_title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  responses JSONB NOT NULL DEFAULT '[]',
  demographic_data JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  completion_time_seconds INTEGER,
  points_awarded INTEGER DEFAULT 0,
  is_exported BOOLEAN DEFAULT false,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin_activity_logs table
CREATE TABLE public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create platform_stats table for caching analytics
CREATE TABLE public.platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_users INTEGER DEFAULT 0,
  active_users_today INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_points_withdrawn INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  surveys_completed INTEGER DEFAULT 0,
  revenue_potential DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stat_date)
);

-- Enable RLS
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

-- Survey responses: Users can insert their own, admins can read all
CREATE POLICY "Users can insert their own survey responses"
ON public.survey_responses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all survey responses"
ON public.survey_responses FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update survey responses"
ON public.survey_responses FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admin activity logs: Only admins can read/write
CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read activity logs"
ON public.admin_activity_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Platform stats: Only admins can read/write
CREATE POLICY "Admins can manage platform stats"
ON public.platform_stats FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create function to get platform statistics
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.users),
    'active_users_today', (SELECT COUNT(*) FROM public.users WHERE last_login_date = CURRENT_DATE),
    'total_points_in_system', (SELECT COALESCE(SUM(total_points), 0) FROM public.users),
    'total_wallet_balance', (SELECT COALESCE(SUM(available_points), 0) FROM public.wallets),
    'pending_withdrawals', (SELECT COUNT(*) FROM public.withdrawals WHERE status = 'pending'),
    'pending_withdrawal_amount', (SELECT COALESCE(SUM(amount), 0) FROM public.withdrawals WHERE status = 'pending'),
    'approved_withdrawals_total', (SELECT COALESCE(SUM(amount), 0) FROM public.withdrawals WHERE status = 'approved'),
    'total_tasks', (SELECT COUNT(*) FROM public.tasks WHERE is_active = true),
    'tasks_completed_today', (SELECT COUNT(*) FROM public.user_tasks WHERE completed_at::DATE = CURRENT_DATE),
    'games_played_today', (SELECT COUNT(*) FROM public.user_game_plays WHERE played_at::DATE = CURRENT_DATE),
    'videos_watched_today', (SELECT COUNT(*) FROM public.user_video_views WHERE watched_at::DATE = CURRENT_DATE),
    'survey_responses_total', (SELECT COUNT(*) FROM public.survey_responses),
    'survey_responses_unexported', (SELECT COUNT(*) FROM public.survey_responses WHERE is_exported = false),
    'total_videos', (SELECT COUNT(*) FROM public.videos WHERE is_active = true),
    'total_transactions', (SELECT COUNT(*) FROM public.transactions),
    'ai_usage_today', (SELECT COUNT(*) FROM public.ai_usage_logs WHERE created_at::DATE = CURRENT_DATE)
  ) INTO result;

  RETURN result;
END;
$$;

-- Create function to export survey data
CREATE OR REPLACE FUNCTION public.export_survey_data(p_mark_exported BOOLEAN DEFAULT true)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Get unexported survey responses
  SELECT json_agg(row_to_json(sr))
  INTO result
  FROM (
    SELECT 
      sr.id,
      sr.survey_id,
      sr.survey_title,
      sr.questions,
      sr.responses,
      sr.demographic_data,
      sr.device_info,
      sr.completion_time_seconds,
      sr.created_at,
      u.email as user_email
    FROM public.survey_responses sr
    LEFT JOIN public.users u ON sr.user_id = u.id
    WHERE sr.is_exported = false
    ORDER BY sr.created_at
  ) sr;

  -- Mark as exported if requested
  IF p_mark_exported THEN
    UPDATE public.survey_responses
    SET is_exported = true, exported_at = now()
    WHERE is_exported = false;
  END IF;

  RETURN json_build_object(
    'success', true,
    'count', COALESCE(json_array_length(result), 0),
    'data', COALESCE(result, '[]'::json)
  );
END;
$$;

-- Create function to log admin activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_activity_logs (admin_user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
END;
$$;