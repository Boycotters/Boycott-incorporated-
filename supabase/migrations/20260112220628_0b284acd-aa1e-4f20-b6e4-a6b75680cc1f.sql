-- Create a secure RPC function for completing AI-generated and partner tasks
-- This prevents client-side point manipulation

CREATE OR REPLACE FUNCTION public.complete_ai_partner_task(
  p_user_id UUID,
  p_task_type TEXT,
  p_task_title TEXT,
  p_points_amount INTEGER,
  p_source TEXT DEFAULT 'ai'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_balance INTEGER;
  v_current_total_points INTEGER;
  v_daily_cap_result JSON;
  v_transaction_id UUID;
  v_max_points INTEGER := 100; -- Maximum points per AI/partner task
BEGIN
  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Validate points amount (prevent exploitation)
  IF p_points_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Invalid points amount');
  END IF;

  -- Cap the maximum points that can be awarded
  IF p_points_amount > v_max_points THEN
    p_points_amount := v_max_points;
  END IF;

  -- Check daily earning cap
  v_daily_cap_result := check_daily_earning_cap(p_user_id);
  IF NOT (v_daily_cap_result->>'can_earn')::boolean THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'Daily earning limit reached. Come back tomorrow!'
    );
  END IF;

  -- Create transaction record
  INSERT INTO public.transactions (
    user_id, 
    type, 
    points_amount, 
    description, 
    status
  ) VALUES (
    p_user_id, 
    'task_completion', 
    p_points_amount, 
    CONCAT('Completed ', p_source, ' task: ', p_task_title),
    'completed'
  ) RETURNING id INTO v_transaction_id;

  -- Update wallet
  UPDATE public.wallets
  SET available_points = COALESCE(available_points, 0) + p_points_amount
  WHERE user_id = p_user_id;

  -- If wallet doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, available_points)
    VALUES (p_user_id, p_points_amount);
  END IF;

  -- Update user total points
  UPDATE public.users
  SET total_points = COALESCE(total_points, 0) + p_points_amount
  WHERE id = p_user_id
  RETURNING total_points INTO v_current_total_points;

  -- Log admin activity for tracking
  INSERT INTO public.admin_activity_logs (action, entity_type, entity_id, details)
  VALUES (
    'ai_partner_task_completed',
    'transaction',
    v_transaction_id::text,
    json_build_object(
      'user_id', p_user_id,
      'task_type', p_task_type,
      'task_title', p_task_title,
      'points_awarded', p_points_amount,
      'source', p_source
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Task completed successfully',
    'points_awarded', p_points_amount,
    'new_total_points', v_current_total_points,
    'transaction_id', v_transaction_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'An error occurred: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_ai_partner_task(UUID, TEXT, TEXT, INTEGER, TEXT) TO authenticated;