-- Drop and recreate get_platform_stats with enhanced data
DROP FUNCTION IF EXISTS public.get_platform_stats();

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users_today', (SELECT COUNT(DISTINCT user_id) FROM transactions WHERE created_at >= CURRENT_DATE),
    'tasks_completed_today', (SELECT COUNT(*) FROM user_tasks WHERE completed_at >= CURRENT_DATE AND status = 'completed'),
    'games_played_today', (SELECT COUNT(*) FROM user_game_plays WHERE played_at >= CURRENT_DATE),
    'videos_watched_today', (SELECT COUNT(*) FROM user_video_views WHERE watched_at >= CURRENT_DATE),
    'ai_usage_today', (SELECT COUNT(*) FROM ai_usage_logs WHERE created_at >= CURRENT_DATE),
    'total_points_in_system', (SELECT COALESCE(SUM(available_points + locked_points), 0) FROM wallets),
    'total_wallet_balance', (SELECT COALESCE(SUM(available_points), 0) FROM wallets),
    'pending_withdrawal_amount', (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'pending'),
    'approved_withdrawals_total', (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'approved'),
    'survey_responses_total', (SELECT COUNT(*) FROM survey_responses),
    'survey_responses_unexported', (SELECT COUNT(*) FROM survey_responses WHERE is_exported = false),
    'total_tasks', (SELECT COUNT(*) FROM tasks WHERE is_active = true),
    'total_videos', (SELECT COUNT(*) FROM videos WHERE is_active = true),
    'total_transactions', (SELECT COUNT(*) FROM transactions),
    'total_referrals', (SELECT COUNT(*) FROM referrals),
    'total_redemptions', (SELECT COUNT(*) FROM redemptions),
    'users_by_tier', (
      SELECT COALESCE(jsonb_object_agg(COALESCE(vip_tier, 'bronze'), cnt), '{}'::jsonb)
      FROM (SELECT vip_tier, COUNT(*) as cnt FROM users GROUP BY vip_tier) t
    ),
    'revenue_potential_zmw', (SELECT COALESCE(SUM(points_awarded), 0) / 15.0 FROM survey_responses WHERE is_exported = false),
    'avg_user_points', (SELECT COALESCE(AVG(total_points), 0) FROM users),
    'max_user_points', (SELECT COALESCE(MAX(total_points), 0) FROM users),
    'users_with_phone_verified', (SELECT COUNT(*) FROM users WHERE phone_verified = true),
    'top_earners', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (SELECT id, full_name, email, total_points FROM users ORDER BY total_points DESC NULLS LAST LIMIT 10) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;