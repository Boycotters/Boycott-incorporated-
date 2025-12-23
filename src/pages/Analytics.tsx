import { ArrowLeft, TrendingUp, Target, Trophy, Calendar, Flame, ChartLine, Award, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

export default function Analytics() {
  const navigate = useNavigate();
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

  // Fetch all completed tasks
  const { data: completedTasks } = useQuery({
    queryKey: ['all-completed-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*, tasks(*)')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch transactions for points history
  const { data: transactions } = useQuery({
    queryKey: ['all-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch achievements
  const { data: earnedAchievements } = useQuery({
    queryKey: ['user-achievements-count', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const totalPoints = userData?.total_points || 0;
  const totalTasks = completedTasks?.length || 0;
  const currentStreak = userData?.current_streak || 0;
  const longestStreak = userData?.longest_streak || 0;
  const level = userData?.level || 1;
  const achievementsCount = earnedAchievements?.length || 0;

  // Calculate weekly points data (last 7 days)
  const getWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayPoints = transactions?.filter(t => {
        const txDate = new Date(t.created_at);
        return txDate >= dayStart && txDate <= dayEnd && t.points_amount > 0;
      }).reduce((sum, t) => sum + (t.points_amount || 0), 0) || 0;
      
      weekData.push({
        day: days[dayStart.getDay()],
        points: dayPoints,
      });
    }
    
    return weekData;
  };

  // Calculate category breakdown
  const getCategoryData = () => {
    const categories: Record<string, number> = {};
    
    completedTasks?.forEach(task => {
      const cat = task.tasks?.category || 'other';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const colors = {
      social: 'hsl(186, 85%, 45%)',
      gaming: 'hsl(280, 70%, 55%)',
      lifestyle: 'hsl(150, 60%, 45%)',
      shopping: 'hsl(40, 95%, 55%)',
      learning: 'hsl(210, 70%, 55%)',
      quick: 'hsl(340, 70%, 55%)',
      challenge: 'hsl(15, 85%, 55%)',
      survey: 'hsl(200, 60%, 50%)',
      video_ad: 'hsl(260, 60%, 55%)',
      app_install: 'hsl(180, 60%, 45%)',
    };
    
    return Object.entries(categories).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      value,
      color: colors[name as keyof typeof colors] || 'hsl(215, 25%, 50%)',
    }));
  };

  // Calculate points by difficulty
  const getDifficultyData = () => {
    const difficulties: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    
    completedTasks?.forEach(task => {
      const diff = task.tasks?.difficulty || 'easy';
      difficulties[diff] = (difficulties[diff] || 0) + (task.points_earned || 0);
    });
    
    return [
      { name: 'Easy', points: difficulties.easy, fill: 'hsl(150, 60%, 45%)' },
      { name: 'Medium', points: difficulties.medium, fill: 'hsl(40, 95%, 55%)' },
      { name: 'Hard', points: difficulties.hard, fill: 'hsl(0, 70%, 55%)' },
    ];
  };

  const weeklyData = getWeeklyData();
  const categoryData = getCategoryData();
  const difficultyData = getDifficultyData();
  const weeklyTotal = weeklyData.reduce((sum, d) => sum + d.points, 0);
  
  // Calculate averages
  const avgPointsPerTask = totalTasks > 0 ? Math.round(totalPoints / totalTasks) : 0;
  const avgDailyPoints = Math.round(weeklyTotal / 7);

  // Progress to next level
  const pointsForNextLevel = level * 1000;
  const currentLevelProgress = totalPoints % 1000;
  const levelProgress = (currentLevelProgress / 1000) * 100;

  return (
    <div className="min-h-screen pb-8 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm">Your personal stats dashboard</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-primary border-0 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs font-medium">Total Points</span>
              </div>
              <p className="text-white text-2xl font-bold">{totalPoints.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 border-0 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs font-medium">Tasks Done</span>
              </div>
              <p className="text-white text-2xl font-bold">{totalTasks}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs font-medium">Current Streak</span>
              </div>
              <p className="text-white text-2xl font-bold">{currentStreak} days</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 border-0 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs font-medium">Achievements</span>
              </div>
              <p className="text-white text-2xl font-bold">{achievementsCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="bg-gradient-card rounded-2xl shadow-card border border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                <span className="font-semibold">Level {level}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentLevelProgress}/{1000} XP
              </span>
            </div>
            <Progress value={levelProgress} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {1000 - currentLevelProgress} points to Level {level + 1}
            </p>
          </CardContent>
        </Card>

        {/* Weekly Points Chart */}
        <Card className="bg-gradient-card rounded-2xl shadow-card border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChartLine className="w-5 h-5 text-primary" />
                Weekly Points
              </CardTitle>
              <span className="text-sm font-semibold text-primary">+{weeklyTotal} pts</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(186, 85%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(186, 85%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(215, 15%, 50%)' }}
                  />
                  <YAxis hide />
                  <Area
                    type="monotone"
                    dataKey="points"
                    stroke="hsl(186, 85%, 45%)"
                    strokeWidth={2}
                    fill="url(#colorPoints)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <Card className="bg-gradient-card rounded-2xl shadow-card border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Task Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {categoryData.slice(0, 5).map((cat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Points by Difficulty */}
        <Card className="bg-gradient-card rounded-2xl shadow-card border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Points by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={difficultyData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    width={60}
                  />
                  <Bar dataKey="points" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-card rounded-2xl shadow-card border border-border">
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs mb-1">Avg. Points/Task</p>
              <p className="text-xl font-bold">{avgPointsPerTask}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card rounded-2xl shadow-card border border-border">
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs mb-1">Avg. Daily Points</p>
              <p className="text-xl font-bold">{avgDailyPoints}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card rounded-2xl shadow-card border border-border">
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs mb-1">Best Streak</p>
              <p className="text-xl font-bold">{longestStreak} days</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card rounded-2xl shadow-card border border-border">
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs mb-1">This Week</p>
              <p className="text-xl font-bold">+{weeklyTotal}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
