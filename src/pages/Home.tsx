import { Trophy, TrendingUp, Target, Clock, Flame, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface StreakResult {
  claimed: boolean;
  already_claimed_today: boolean;
  current_streak: number;
  longest_streak: number;
  bonus_points: number;
}

export default function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [streakData, setStreakData] = useState<StreakResult | null>(null);

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ['user-data', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, wallets(*)')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check login streak on load
  const checkStreakMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('check_login_streak', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      return data as unknown as StreakResult;
    },
    onSuccess: (data) => {
      setStreakData(data);
      
      if (data.claimed) {
        toast.success(`🔥 Day ${data.current_streak} streak! +${data.bonus_points} bonus points!`);
        queryClient.invalidateQueries({ queryKey: ['user-data'] });
        queryClient.invalidateQueries({ queryKey: ['check-achievements'] });
      }
    },
  });

  // Auto-check streak on component mount
  useEffect(() => {
    if (user?.id && !streakData) {
      checkStreakMutation.mutate();
    }
  }, [user?.id]);

  // Fetch completed tasks this week
  const { data: weeklyTasks } = useQuery({
    queryKey: ['weekly-tasks', user?.id],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('user_tasks')
        .select('points_earned')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo.toISOString());
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch completed tasks today
  const { data: todayTasks } = useQuery({
    queryKey: ['today-tasks', user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString());
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent activities
  const { data: recentActivities } = useQuery({
    queryKey: ['recent-activities', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*, tasks(*)')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totalPoints = userData?.wallets?.[0]?.available_points || 0;
  const level = userData?.level || 1;
  const weeklyPoints = weeklyTasks?.reduce((sum, task) => sum + (task.points_earned || 0), 0) || 0;
  const todayCompleted = todayTasks?.length || 0;
  
  // Calculate progress to next level (assume 1000 points per level)
  const currentLevelPoints = (userData?.total_points || 0) % 1000;
  const progressToNextLevel = (currentLevelPoints / 1000) * 100;

  const currentStreak = streakData?.current_streak || userData?.current_streak || 0;
  const longestStreak = streakData?.longest_streak || userData?.longest_streak || 0;

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const completed = new Date(date);
    const diffInHours = Math.floor((now.getTime() - completed.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Keep earning rewards daily</p>
        </div>

        {/* Daily Streak Card */}
        <Card className="bg-gradient-to-br from-orange-500 to-red-600 p-5 rounded-3xl shadow-hover border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium">Daily Streak</p>
                  <p className="text-white text-2xl font-bold">{currentStreak} Days</p>
                </div>
              </div>
              {streakData?.already_claimed_today ? (
                <div className="bg-white/20 px-3 py-1.5 rounded-xl">
                  <span className="text-white text-sm font-medium">✓ Claimed</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="bg-white text-orange-600 hover:bg-white/90 font-bold rounded-xl"
                  onClick={() => checkStreakMutation.mutate()}
                  disabled={checkStreakMutation.isPending}
                >
                  <Gift className="w-4 h-4 mr-1" />
                  Claim
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Best streak: {longestStreak} days</span>
              <span className="text-white/80">
                Next bonus: +{5 + Math.floor(Math.min(currentStreak + 1, 30) / 7) * 5} pts
              </span>
            </div>
          </div>
        </Card>

        {/* Points Card */}
        <Card className="bg-gradient-primary p-6 rounded-3xl shadow-hover border-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Total Points</p>
              <h2 className="text-white text-4xl font-bold">{totalPoints.toLocaleString()}</h2>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-2xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/90 font-medium">Level {level}</span>
              <span className="text-white/90">{Math.round(progressToNextLevel)}% to Level {level + 1}</span>
            </div>
            <Progress value={progressToNextLevel} className="mt-2 h-2 bg-white/20" />
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-primary/10 p-2 rounded-xl">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">This Week</span>
            </div>
            <p className="text-2xl font-bold">+{weeklyPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">Points earned</p>
          </Card>

          <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-accent/10 p-2 rounded-xl">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold">{todayCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">Today's tasks</p>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <Card
                key={activity.id}
                className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border hover:shadow-hover transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary p-2 rounded-xl">
                      <Clock className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{activity.tasks?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.completed_at ? getTimeAgo(activity.completed_at) : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <span className="text-accent font-bold text-lg">+{activity.points_earned}</span>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border">
              <p className="text-center text-muted-foreground text-sm">
                No activities yet. Start completing tasks to see your progress!
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
