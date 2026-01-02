import { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, Target, Trophy, Sparkles, Clock, Users, 
  Flame, Zap, Crown, Star, ChevronRight, Play, Gift, Rocket,
  Timer, Eye, Heart, Share2, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TaskRecommendations } from "@/components/ai/TaskRecommendations";
import { PartnershipCard } from "@/components/ai/PartnershipCard";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeAgo } from "@/lib/utils";

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [likedTasks, setLikedTasks] = useState<Set<string>>(new Set());

  // Flash deal countdown - resets at midnight
  const [flashDealsEndTime] = useState(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight;
  });

  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Countdown timer for flash deals
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = flashDealsEndTime.getTime();
      const diff = Math.max(0, end - now);

      setCountdown({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [flashDealsEndTime]);

  // Fetch trending tasks
  const { data: trendingTasks, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('points_reward', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user profile for AI recommendations
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch REAL live activity from transactions
  const { data: liveActivities, refetch: refetchActivities } = useQuery({
    queryKey: ['live-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, users:user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      return data?.map(tx => ({
        user: tx.users?.full_name?.split(' ')[0] || 'User',
        action: tx.type === 'earn' ? 'earned' : tx.type === 'redeem' ? 'redeemed' : 'completed',
        task: tx.description?.replace('Completed: ', '').replace('Redeemed: ', '') || 'Task',
        points: tx.points_amount || 0,
        time: formatTimeAgo(tx.created_at || new Date().toISOString()),
      })) || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch real leaderboard
  const { data: topEarners } = useQuery({
    queryKey: ['leaderboard-discover'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, total_points, vip_tier')
        .order('total_points', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data?.map((user, i) => ({
        name: user.full_name || 'Anonymous',
        points: user.total_points || 0,
        rank: i + 1,
        avatar: (user.full_name || 'A').slice(0, 2).toUpperCase(),
        tier: user.vip_tier || 'bronze',
      }));
    },
  });

  // Fetch completion stats for challenges
  const { data: completionStats } = useQuery({
    queryKey: ['completion-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('status, task_id, completed_at')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      const completed = data.filter(t => t.status === 'completed').length;
      const today = new Date().toDateString();
      const completedToday = data.filter(t => 
        t.status === 'completed' && 
        t.completed_at && 
        new Date(t.completed_at).toDateString() === today
      ).length;
      
      return { completed, total: 20, completedToday };
    },
    enabled: !!user?.id,
  });

  // Fetch video watch count
  const { data: videoStats } = useQuery({
    queryKey: ['video-stats', user?.id],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count, error } = await supabase
        .from('user_video_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('watched_at', weekAgo.toISOString());
      
      if (error) throw error;
      return { videosWatched: count || 0 };
    },
    enabled: !!user?.id,
  });

  // Online users count (simulated but varies realistically)
  const onlineUsers = useMemo(() => {
    const hour = new Date().getHours();
    const base = hour >= 9 && hour <= 22 ? 350 : 150;
    return base + Math.floor(Math.random() * 100);
  }, []);

  const challenges = useMemo(() => [
    {
      id: 1,
      title: "Task Master",
      description: "Complete 20 tasks this month",
      reward: 500,
      progress: completionStats?.completed || 0,
      total: 20,
      icon: Target,
      color: "primary",
    },
    {
      id: 2,
      title: "Daily Grinder",
      description: "Complete 5 tasks today",
      reward: 100,
      progress: completionStats?.completedToday || 0,
      total: 5,
      icon: Flame,
      color: "accent",
    },
    {
      id: 3,
      title: "Streak Legend",
      description: `${userProfile?.current_streak || 0} day streak`,
      reward: 300,
      progress: userProfile?.current_streak || 0,
      total: 7,
      icon: Zap,
      color: "primary",
    },
    {
      id: 4,
      title: "Video Watcher",
      description: "Watch 10 videos this week",
      reward: 200,
      progress: videoStats?.videosWatched || 0,
      total: 10,
      icon: Play,
      color: "accent",
    },
  ], [completionStats, userProfile, videoStats]);

  const flashDeals = [
    { title: "2x Points", description: "All social tasks", multiplier: 2, category: "social" },
    { title: "Bonus +50", description: "First task today", bonus: 50, category: "any" },
  ];

  const toggleLike = (taskId: string) => {
    setLikedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'social': return <Share2 className="w-4 h-4" />;
      case 'gaming': return <Trophy className="w-4 h-4" />;
      case 'lifestyle': return <Heart className="w-4 h-4" />;
      case 'shopping': return <Gift className="w-4 h-4" />;
      case 'learning': return <Star className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case 'diamond': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      default: return '🥉';
    }
  };

  if (trendingLoading) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-5">
        {/* Header with Live Counter */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Discover
              <Sparkles className="w-6 h-6 text-accent animate-pulse" />
            </h1>
            <p className="text-muted-foreground">Find your next opportunity</p>
          </div>
          <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {onlineUsers} online
            </span>
          </div>
        </div>

        {/* Flash Deal Timer */}
        <Card className="bg-gradient-to-r from-accent/20 to-primary/20 border-0 rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-accent p-2 rounded-xl animate-pulse">
                  <Timer className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Flash Deals Ending</p>
                  <p className="text-xs text-muted-foreground">Grab them before midnight!</p>
                </div>
              </div>
              <div className="flex gap-1 font-mono text-lg font-bold">
                <span className="bg-background/80 px-2 py-1 rounded">{String(countdown.hours).padStart(2, '0')}</span>
                <span>:</span>
                <span className="bg-background/80 px-2 py-1 rounded">{String(countdown.minutes).padStart(2, '0')}</span>
                <span>:</span>
                <span className="bg-background/80 px-2 py-1 rounded">{String(countdown.seconds).padStart(2, '0')}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {flashDeals.map((deal, i) => (
                <div key={i} className="flex-1 bg-background/60 backdrop-blur-sm p-3 rounded-xl text-center cursor-pointer hover:bg-background/80 transition-colors" onClick={() => navigate('/earn')}>
                  <p className="font-bold text-primary">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">{deal.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Activity Feed - REAL DATA */}
        <Card className="bg-card border rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Activity
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground"
                onClick={() => refetchActivities()}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-32 overflow-hidden">
              {(liveActivities || []).slice(0, 4).map((activity, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between text-sm py-1.5 animate-in slide-in-from-top-2"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar className="w-6 h-6 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {activity.user[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground truncate">
                      <span className="font-medium text-foreground">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="text-foreground">{activity.task}</span>
                    </span>
                  </div>
                  <span className={`font-semibold shrink-0 ${activity.points > 0 ? 'text-accent' : 'text-destructive'}`}>
                    {activity.points > 0 ? '+' : ''}{activity.points}
                  </span>
                </div>
              ))}
              {(!liveActivities || liveActivities.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="for-you" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="for-you" className="text-xs">For You</TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">Trending</TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs">Challenges</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs">Top</TabsTrigger>
          </TabsList>

          {/* For You Tab - AI Powered */}
          <TabsContent value="for-you" className="space-y-4">
            {/* AI Recommendations */}
            {userProfile && (
              <TaskRecommendations
                userLevel={userProfile.level || 1}
                completedCategories={[]}
                interests={['social', 'gaming']}
                vipTier={userProfile.vip_tier || 'bronze'}
                onSelectCategory={(category) => navigate(`/earn?category=${category}`)}
              />
            )}

            {/* Partnership Opportunities */}
            <PartnershipCard
              brandCategory="lifestyle"
              targetAudience="gen-z"
              campaignType="engagement"
              onStartTask={(task) => navigate('/earn')}
            />

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => navigate('/videos')}
              >
                <CardContent className="p-4 text-center">
                  <div className="bg-primary/10 p-3 rounded-2xl w-fit mx-auto mb-2">
                    <Play className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">Watch Videos</p>
                  <p className="text-xs text-muted-foreground">Earn while you scroll</p>
                </CardContent>
              </Card>
              <Card 
                className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => navigate('/surveys')}
              >
                <CardContent className="p-4 text-center">
                  <div className="bg-accent/10 p-3 rounded-2xl w-fit mx-auto mb-2">
                    <Target className="w-6 h-6 text-accent" />
                  </div>
                  <p className="font-semibold text-sm">Take Surveys</p>
                  <p className="text-xs text-muted-foreground">Share your opinion</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="space-y-4">
            {/* Hero Challenge */}
            <Card className="bg-gradient-primary border-0 rounded-3xl overflow-hidden shadow-hover">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-primary-foreground/20 text-primary-foreground mb-2 text-xs">
                      🔥 Hot Right Now
                    </Badge>
                    <CardTitle className="text-primary-foreground text-xl mb-1">Weekend Warrior</CardTitle>
                    <CardDescription className="text-primary-foreground/80 text-sm">
                      Complete 5 tasks for 2x points bonus!
                    </CardDescription>
                  </div>
                  <div className="bg-primary-foreground/20 backdrop-blur-sm p-3 rounded-2xl">
                    <Rocket className="w-7 h-7 text-primary-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-3">
                  <Progress 
                    value={(completionStats?.completedToday || 0) / 5 * 100} 
                    className="h-2 flex-1 bg-primary-foreground/20" 
                  />
                  <span className="text-primary-foreground text-sm font-medium">
                    {completionStats?.completedToday || 0}/5
                  </span>
                </div>
                <Button 
                  className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold py-5 rounded-2xl"
                  onClick={() => navigate('/earn')}
                >
                  Continue Challenge
                </Button>
              </CardContent>
            </Card>

            {/* Trending Tasks Grid */}
            <div className="space-y-3">
              {trendingTasks?.map((task, index) => (
                <Card
                  key={task.id}
                  className="bg-card rounded-2xl border hover:shadow-hover transition-all duration-300 overflow-hidden cursor-pointer"
                  onClick={() => navigate('/earn')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`${index === 0 ? 'bg-accent/20' : 'bg-primary/10'} p-2.5 rounded-xl`}>
                        {getCategoryIcon(task.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-accent font-bold">+{task.points_reward}</span>
                            {index === 0 && (
                              <Badge className="block mt-1 bg-accent/20 text-accent text-xs px-1.5">
                                2x
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            {task.difficulty && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {task.difficulty}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              ~5 min
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant={likedTasks.has(task.id) ? "secondary" : "ghost"}
                            className="h-7 w-7 p-0"
                            onClick={(e) => { e.stopPropagation(); toggleLike(task.id); }}
                          >
                            <Heart className={`w-4 h-4 ${likedTasks.has(task.id) ? 'fill-destructive text-destructive' : ''}`} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-4">
            {challenges.map((challenge) => {
              const Icon = challenge.icon;
              const progress = Math.min(100, (challenge.progress / challenge.total) * 100);
              const isComplete = challenge.progress >= challenge.total;

              return (
                <Card key={challenge.id} className={`overflow-hidden ${isComplete ? 'bg-accent/10 border-accent/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        isComplete ? 'bg-accent/20' : challenge.color === 'accent' ? 'bg-accent/10' : 'bg-primary/10'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isComplete ? 'text-accent' : challenge.color === 'accent' ? 'text-accent' : 'text-primary'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{challenge.title}</h3>
                          <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                            +{challenge.reward} pts
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="flex-1 h-2" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {challenge.progress}/{challenge.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Leaderboard Tab - REAL DATA */}
          <TabsContent value="leaderboard" className="space-y-4">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-yellow-500/30 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold">Top Earners This Week</h3>
                </div>
                <div className="space-y-3">
                  {topEarners?.map((earner, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-2 rounded-xl ${
                        index === 0 ? 'bg-yellow-500/20' : 'bg-background/50'
                      }`}
                    >
                      <span className="text-lg font-bold w-6 text-center">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {earner.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{earner.name}</p>
                        <p className="text-xs text-muted-foreground">{getTierEmoji(earner.tier)} {earner.tier}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-accent">{earner.points.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate('/referrals')}
                >
                  View Full Leaderboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Your Rank */}
            {userProfile && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(userProfile.full_name || 'You').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">Your Rank</p>
                      <p className="text-sm text-muted-foreground">
                        {getTierEmoji(userProfile.vip_tier || 'bronze')} {userProfile.vip_tier || 'Bronze'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">{(userProfile.total_points || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">total pts</p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
