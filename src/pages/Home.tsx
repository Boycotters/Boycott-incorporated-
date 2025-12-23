import { Trophy, TrendingUp, Target, Clock, Flame, Gift, Crown, Calendar as CalendarIcon, ChevronRight, Award, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface StreakResult {
  claimed: boolean;
  already_claimed_today: boolean;
  current_streak: number;
  longest_streak: number;
  bonus_points: number;
}

interface VipTier {
  name: string;
  slug: string;
  multiplier: number;
  icon: string;
  min_points: number;
}

interface LeaderboardUser {
  id: string;
  full_name: string;
  total_points: number;
  vip_tier: string;
}

export default function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [streakData, setStreakData] = useState<StreakResult | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

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

  // Fetch VIP tier info
  const { data: vipTier } = useQuery({
    queryKey: ['user-vip-tier', userData?.vip_tier],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_tiers')
        .select('name, slug, multiplier, icon, min_points')
        .eq('slug', userData?.vip_tier || 'bronze')
        .single();
      
      if (error) throw error;
      return data as VipTier;
    },
    enabled: !!userData?.vip_tier,
  });

  // Fetch next VIP tier
  const { data: nextVipTier } = useQuery({
    queryKey: ['next-vip-tier', userData?.total_points],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_tiers')
        .select('name, slug, multiplier, icon, min_points')
        .gt('min_points', userData?.total_points || 0)
        .order('min_points', { ascending: true })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as VipTier | null;
    },
    enabled: !!userData,
  });

  // Fetch leaderboard (top 3)
  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard-top3'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, total_points, vip_tier')
        .order('total_points', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as LeaderboardUser[];
    },
  });

  // Fetch featured reward
  const { data: featuredReward } = useQuery({
    queryKey: ['featured-reward'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('id, name, points_cost, image')
        .eq('is_active', true)
        .order('points_cost', { ascending: true })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      const [referralsResult, achievementsResult] = await Promise.all([
        supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', user?.id),
        supabase
          .from('user_achievements')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user?.id)
      ]);
      
      return {
        referrals: referralsResult.count || 0,
        achievements: achievementsResult.count || 0
      };
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
  
  const currentLevelPoints = (userData?.total_points || 0) % 1000;
  const progressToNextLevel = (currentLevelPoints / 1000) * 100;

  const currentStreak = streakData?.current_streak || userData?.current_streak || 0;
  const longestStreak = streakData?.longest_streak || userData?.longest_streak || 0;

  const getTierGradient = (slug: string) => {
    switch (slug) {
      case 'bronze': return 'from-amber-700 to-amber-500';
      case 'silver': return 'from-slate-400 to-slate-300';
      case 'gold': return 'from-yellow-500 to-amber-300';
      case 'diamond': return 'from-cyan-400 to-blue-300';
      default: return 'from-primary to-primary/80';
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const completed = new Date(date);
    const diffInHours = Math.floor((now.getTime() - completed.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getLeaderboardPosition = (index: number) => {
    switch (index) {
      case 0: return { emoji: '🥇', bg: 'bg-yellow-500/20' };
      case 1: return { emoji: '🥈', bg: 'bg-slate-400/20' };
      case 2: return { emoji: '🥉', bg: 'bg-amber-600/20' };
      default: return { emoji: '', bg: 'bg-muted' };
    }
  };

  const progressToNextTier = nextVipTier 
    ? Math.min(100, ((userData?.total_points || 0) - (vipTier?.min_points || 0)) / (nextVipTier.min_points - (vipTier?.min_points || 0)) * 100)
    : 100;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Keep earning rewards daily</p>
        </div>

        {/* Calendar Card */}
        <Card className="bg-gradient-card p-4 rounded-3xl shadow-card border border-border overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Activity Calendar</h3>
          </div>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-xl border-0 p-0"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                row: "flex w-full mt-1",
                cell: "h-8 w-8 text-center text-sm p-0 relative",
                day: "h-8 w-8 p-0 font-normal text-xs hover:bg-primary/10 rounded-lg transition-colors",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground font-bold",
                day_outside: "opacity-30",
              }}
            />
          </div>
        </Card>

        {/* VIP Status Card */}
        <Card 
          className={`bg-gradient-to-br ${getTierGradient(vipTier?.slug || 'bronze')} p-5 rounded-3xl shadow-hover border-0 cursor-pointer hover:scale-[1.02] transition-transform`}
          onClick={() => navigate('/vip')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{vipTier?.icon || '🥉'}</div>
              <div>
                <p className="text-white/80 text-sm font-medium">{vipTier?.name || 'Bronze'} Member</p>
                <p className="text-white text-xl font-bold">
                  {vipTier?.multiplier && vipTier.multiplier > 1 
                    ? `${vipTier.multiplier}x Points Multiplier` 
                    : 'Standard Rewards'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60" />
          </div>
          {nextVipTier && (
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
              <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                <span>Progress to {nextVipTier.icon} {nextVipTier.name}</span>
                <span>{(nextVipTier.min_points - (userData?.total_points || 0)).toLocaleString()} pts left</span>
              </div>
              <Progress value={progressToNextTier} className="h-2 bg-white/20" />
            </div>
          )}
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border cursor-pointer hover:shadow-hover transition-all"
            onClick={() => navigate('/referrals')}
          >
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-2 rounded-xl">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userStats?.referrals || 0}</p>
                <p className="text-xs text-muted-foreground">Referrals</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border cursor-pointer hover:shadow-hover transition-all"
            onClick={() => navigate('/achievements')}
          >
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/10 p-2 rounded-xl">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userStats?.achievements || 0}</p>
                <p className="text-xs text-muted-foreground">Achievements</p>
              </div>
            </div>
          </Card>
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

        {/* Featured Reward */}
        {featuredReward && (
          <Card 
            className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border cursor-pointer hover:shadow-hover transition-all overflow-hidden"
            onClick={() => navigate('/marketplace')}
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Featured Reward</h3>
              <Badge variant="secondary" className="ml-auto text-xs">Hot 🔥</Badge>
            </div>
            <div className="flex items-center gap-4">
              {featuredReward.image && (
                <img 
                  src={featuredReward.image} 
                  alt={featuredReward.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              )}
              <div className="flex-1">
                <p className="font-semibold">{featuredReward.name}</p>
                <p className="text-sm text-muted-foreground">Redeem now!</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{featuredReward.points_cost}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard Preview */}
        <Card className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Top Earners</h3>
            </div>
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {leaderboard?.map((leader, index) => {
              const position = getLeaderboardPosition(index);
              const isCurrentUser = leader.id === user?.id;
              
              return (
                <div 
                  key={leader.id}
                  className={`flex items-center justify-between p-2 rounded-xl ${position.bg} ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center">{position.emoji}</span>
                    <div>
                      <p className="font-medium text-sm">
                        {leader.full_name || 'Anonymous'}
                        {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{leader.vip_tier} tier</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm">{leader.total_points.toLocaleString()} pts</p>
                </div>
              );
            })}
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
