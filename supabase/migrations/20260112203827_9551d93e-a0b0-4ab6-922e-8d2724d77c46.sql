-- Remove all existing admin users and set only alexboycott2@gmail.com as admin
DELETE FROM public.admin_users;

-- Insert alexboycott2@gmail.com as the only admin
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'alexboycott2@gmail.com';

-- Create a weekend_campaigns table for weekend-only tasks
CREATE TABLE IF NOT EXISTS public.weekend_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  bonus_multiplier NUMERIC(3,2) DEFAULT 1.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.weekend_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can manage weekend campaigns
CREATE POLICY "Admins can manage weekend campaigns"
ON public.weekend_campaigns
FOR ALL
USING (public.is_admin(auth.uid()));

-- Everyone can read active weekend campaigns
CREATE POLICY "Users can view active weekend campaigns"
ON public.weekend_campaigns
FOR SELECT
USING (is_active = true);

-- Create function to check if tasks are available today
CREATE OR REPLACE FUNCTION public.are_tasks_available_today()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_day INTEGER;
  is_weekend BOOLEAN;
  has_weekend_campaign BOOLEAN;
  campaign_name TEXT;
  campaign_bonus NUMERIC;
BEGIN
  -- Get current day of week (0 = Sunday, 6 = Saturday in Postgres)
  current_day := EXTRACT(DOW FROM CURRENT_DATE);
  
  -- Check if it's weekend (Saturday = 6, Sunday = 0)
  is_weekend := current_day IN (0, 6);
  
  -- Check if there's an active weekend campaign for today
  SELECT 
    EXISTS(
      SELECT 1 FROM weekend_campaigns 
      WHERE is_active = true 
      AND CURRENT_DATE BETWEEN start_date AND end_date
    ),
    wc.name,
    wc.bonus_multiplier
  INTO has_weekend_campaign, campaign_name, campaign_bonus
  FROM weekend_campaigns wc
  WHERE wc.is_active = true 
  AND CURRENT_DATE BETWEEN wc.start_date AND wc.end_date
  LIMIT 1;
  
  -- If it's weekend and no campaign, tasks are not available
  IF is_weekend AND NOT COALESCE(has_weekend_campaign, false) THEN
    RETURN json_build_object(
      'available', false,
      'is_weekend', true,
      'has_campaign', false,
      'message', 'Tasks are available Monday-Friday. Check back on Monday or during special weekend campaigns!'
    );
  END IF;
  
  -- If weekend with campaign
  IF is_weekend AND COALESCE(has_weekend_campaign, false) THEN
    RETURN json_build_object(
      'available', true,
      'is_weekend', true,
      'has_campaign', true,
      'campaign_name', campaign_name,
      'bonus_multiplier', COALESCE(campaign_bonus, 1.0),
      'message', 'Weekend Campaign Active! ' || COALESCE(campaign_name, 'Special Weekend Event')
    );
  END IF;
  
  -- Weekday - tasks always available
  RETURN json_build_object(
    'available', true,
    'is_weekend', false,
    'has_campaign', false,
    'message', 'Tasks available today!'
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.are_tasks_available_today() TO authenticated;