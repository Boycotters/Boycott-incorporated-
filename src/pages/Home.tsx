import { Trophy, TrendingUp, Target, Clock, Flame, Gift, Crown, ChevronRight, Award, Users, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, subDays, isToday } from "date-fns";
import { LiveWalletCard } from "@/components/wallet";
import { DailyLimitsProgress } from "@/components/DailyLimitsProgress";
import { NotificationBell } from "@/components/home/NotificationBell";
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Generate 7 days with today in the middle
  const weekDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(subDays(today, 3), i);
      return {
        date,
        dayName: format(date, 'EEE'),
        dayNum: format(date, 'd'),
        isToday: isToday(date),
        isSelected: format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      };
    });
  }, [selectedDate]);

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
  const lockedPoints = userData?.wallets?.[0]?.locked_points || 0;
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
    <div className="min-h-screen pb-24 px-4 pt-4">
      <div className="max-w-md mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-sm text-muted-foreground">Keep earning rewards daily</p>
          </div>
          <NotificationBell />
        </div>

        {/* Live Wallet Card */}
        <LiveWalletCard 
          availablePoints={totalPoints} 
          lockedPoints={lockedPoints}
        />

        {/* Week Calendar Strip */}
        <div className="flex gap-1.5 justify-between">
          {weekDays.map((day) => (
            <button
              key={day.dayNum}
              onClick={() => setSelectedDate(day.date)}
              className={`flex-1 flex flex-col items-center py-2 px-1 rounded-2xl transition-all ${
                day.isToday 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : day.isSelected 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-card border border-border hover:bg-muted'
              }`}
            >
              <span className={`text-[10px] uppercase font-medium ${day.isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {day.dayName}
              </span>
              <span className={`text-base font-bold ${day.isToday ? '' : ''}`}>
                {day.dayNum}
              </span>
            </button>
          ))}
        </div>

        {/* VIP Status Card */}
        <Card 
          className={`bg-gradient-to-br ${getTierGradient(vipTier?.slug || 'bronze')} p-3 rounded-2xl shadow-hover border-0 cursor-pointer hover:scale-[1.01] transition-transform`}
          onClick={() => navigate('/vip')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{vipTier?.icon || '🥉'}</span>
              <div>
                <p className="text-white/80 text-xs font-medium">{vipTier?.name || 'Bronze'}</p>
                <p className="text-white text-sm font-bold">
                  {vipTier?.multiplier && vipTier.multiplier > 1 
                    ? `${vipTier.multiplier}x Multiplier` 
                    : 'Standard'}
                </p>
              </div>
            </div>
            {nextVipTier && (
              <div className="flex-1 mx-3">
                <Progress value={progressToNextTier} className="h-1.5 bg-white/20" />
                <p className="text-[10px] text-white/70 mt-0.5 text-right">{(nextVipTier.min_points - (userData?.total_points || 0)).toLocaleString()} to {nextVipTier.name}</p>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-white/60" />
          </div>
        </Card>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 gap-2">
          <Card 
            className="bg-gradient-card p-3 rounded-xl shadow-card border border-border cursor-pointer hover:shadow-hover transition-all"
            onClick={() => navigate('/referrals')}
          >
            <div className="flex items-center gap-2">
              <div className="bg-green-500/10 p-1.5 rounded-lg">
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{userStats?.referrals || 0}</p>
                <p className="text-[10px] text-muted-foreground">Referrals</p>
              </div>
            </div>
          </Card>
          <Card 
            className="bg-gradient-card p-3 rounded-xl shadow-card border border-border cursor-pointer hover:shadow-hover transition-all"
            onClick={() => navigate('/achievements')}
          >
            <div className="flex items-center gap-2">
              <div className="bg-purple-500/10 p-1.5 rounded-lg">
                <Award className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{userStats?.achievements || 0}</p>
                <p className="text-[10px] text-muted-foreground">Achievements</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Daily Limits Progress */}
        <DailyLimitsProgress />

        {/* Daily Streak Card */}
        <Card className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-2xl shadow-hover border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-medium">Daily Streak</p>
                  <p className="text-white text-lg font-bold leading-tight">{currentStreak} Days</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Streak Shield for VIP (FR-STRK-004) */}
                {(vipTier?.slug === 'platinum' || vipTier?.slug === 'diamond') && (
                  <Button
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] h-7 px-2"
                    onClick={async () => {
                      const { data, error } = await supabase.rpc('use_streak_shield', { p_user_id: user?.id });
                      if (error) { toast.error('Failed to activate shield'); return; }
                      const result = data as any;
                      if (result?.success) toast.success(result.message);
                      else toast.error(result?.message || 'Shield unavailable');
                    }}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    Shield
                  </Button>
                )}
                {streakData?.already_claimed_today ? (
                  <div className="bg-white/20 px-2 py-1 rounded-lg">
                    <span className="text-white text-xs font-medium">✓ Claimed</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="bg-white text-orange-600 hover:bg-white/90 font-bold rounded-lg text-xs h-7 px-2"
                    onClick={() => checkStreakMutation.mutate()}
                    disabled={checkStreakMutation.isPending}
                  >
                    <Gift className="w-3 h-3 mr-1" />
                    Claim
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] mt-1.5">
              <span className="text-white/70">Best: {longestStreak} days</span>
              <span className="text-white/70">
                Next: +{5 + Math.floor(Math.min(currentStreak + 1, 30) / 7) * 5} pts
              </span>
            </div>
          </div>
        </Card>

        {/* Featured Reward */}
        {featuredReward && (
          <Card 
            className="bg-gradient-card p-3 rounded-xl shadow-card border border-border cursor-pointer hover:shadow-hover transition-all"
            onClick={() => navigate('/marketplace')}
          >
            <div className="flex items-center gap-3">
              {featuredReward.image && (
                <img 
                  src={featuredReward.image} 
                  alt={featuredReward.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Gift className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Featured</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">🔥</Badge>
                </div>
                <p className="font-semibold text-sm truncate">{featuredReward.name}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-primary">{featuredReward.points_cost}</p>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard Preview */}
        <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold">Top Earners</h3>
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2">
              View All
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          <div className="space-y-1.5">
            {(leaderboard || []).map((leader, index) => {
              const position = getLeaderboardPosition(index);
              const isCurrentUser = leader.id === user?.id;
              
              return (
                <div 
                  key={leader.id}
                  className={`flex items-center justify-between p-1.5 rounded-lg ${position.bg} ${isCurrentUser ? 'ring-1 ring-primary' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base w-6 text-center">{position.emoji}</span>
                    <div>
                      <p className="font-medium text-xs">
                        {leader.full_name || 'Anonymous'}
                        {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-xs">{leader.total_points.toLocaleString()} pts</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Points Card */}
        <Card className="bg-gradient-primary p-4 rounded-2xl shadow-hover border-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white/80 text-xs font-medium">Available Points</p>
              <h2 className="text-white text-2xl font-bold">{totalPoints.toLocaleString()}</h2>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
              <Trophy className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <p className="text-white/60 text-[10px]">Pending</p>
              <p className="text-white text-sm font-bold">{lockedPoints.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <p className="text-white/60 text-[10px]">Lifetime Earned</p>
              <p className="text-white text-sm font-bold">{(userData?.total_points || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/90 font-medium">Level {level}</span>
              <span className="text-white/90">{Math.round(progressToNextLevel)}% to Lvl {level + 1}</span>
            </div>
            <Progress value={progressToNextLevel} className="mt-1 h-1.5 bg-white/20" />
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground text-[10px] font-medium">This Week</span>
            </div>
            <p className="text-lg font-bold">+{weeklyPoints}</p>
          </Card>

          <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-accent/10 p-1.5 rounded-lg">
                <Target className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-muted-foreground text-[10px] font-medium">Today</span>
            </div>
            <p className="text-lg font-bold">{todayCompleted} tasks</p>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <Card
                key={activity.id}
                className="bg-gradient-card p-2.5 rounded-xl shadow-card border border-border hover:shadow-hover transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-secondary p-1.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-xs">{activity.tasks?.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {activity.completed_at ? getTimeAgo(activity.completed_at) : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <span className="text-accent font-bold text-sm">+{activity.points_earned}</span>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border">
              <p className="text-center text-muted-foreground text-xs">
                No activities yet. Start completing tasks!
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
