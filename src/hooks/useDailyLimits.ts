import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DailyActivityStatus {
  ai_tasks: { completed: number; max: number; remaining: number };
  surveys: { completed: number; max: number; remaining: number };
  videos: { completed: number; max: number; remaining: number };
  games: { completed: number; max: number; remaining: number };
  regular_tasks: { completed: number; max: number; remaining: number };
  total_points: { earned: number; max: number; remaining: number };
}

export function useDailyLimits() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['daily-activity-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_daily_activity_status', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      return data as unknown as DailyActivityStatus;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const canDoActivity = (type: keyof Omit<DailyActivityStatus, 'total_points'>) => {
    if (!data) return true;
    return data[type].remaining > 0 && data.total_points.remaining > 0;
  };

  const getRemainingForActivity = (type: keyof Omit<DailyActivityStatus, 'total_points'>) => {
    if (!data) return { count: 0, points: 0 };
    return {
      count: data[type].remaining,
      points: data.total_points.remaining
    };
  };

  return {
    data,
    isLoading,
    refetch,
    canDoActivity,
    getRemainingForActivity,
    hasReachedDailyCap: data ? data.total_points.remaining <= 0 : false,
    totalPointsEarned: data?.total_points.earned ?? 0,
    totalPointsRemaining: data?.total_points.remaining ?? 180,
    maxDailyPoints: 180,
  };
}
