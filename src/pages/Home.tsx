import { Trophy, TrendingUp, Target, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const { user } = useAuth();

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
  const pointsForNextLevel = level * 1000;
  const currentLevelPoints = (userData?.total_points || 0) % 1000;
  const progressToNextLevel = (currentLevelPoints / 1000) * 100;

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