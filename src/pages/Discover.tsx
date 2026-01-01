import { useState, useEffect } from "react";
import { 
  TrendingUp, Target, Trophy, Video, Sparkles, Clock, Users, 
  Flame, Zap, Crown, Star, ChevronRight, Play, Gift, Rocket,
  Timer, Eye, Heart, Share2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TaskRecommendations } from "@/components/ai/TaskRecommendations";
import { PartnershipCard } from "@/components/ai/PartnershipCard";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState({ hours: 2, minutes: 45, seconds: 30 });
  const [likedTasks, setLikedTasks] = useState<Set<string>>(new Set());

  // Countdown timer for flash deals
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 }; // Reset
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Simulated live activity feed
  const liveActivities = [
    { user: "Alex", action: "completed", task: "TikTok Trend Check", points: 35, time: "2m ago" },
    { user: "Sarah", action: "earned", task: "Daily Streak bonus", points: 150, time: "5m ago" },
    { user: "Mike", action: "redeemed", task: "$10 Gift Card", points: -1000, time: "8m ago" },
    { user: "Jess", action: "completed", task: "Video Review", points: 75, time: "12m ago" },
    { user: "Chris", action: "unlocked", task: "Gold VIP Tier", points: 500, time: "15m ago" },
  ];

  // Featured creators/top earners
  const topEarners = [
    { name: "Alex M.", points: 12500, rank: 1, avatar: "AM" },
    { name: "Sarah K.", points: 11200, rank: 2, avatar: "SK" },
    { name: "Mike T.", points: 10800, rank: 3, avatar: "MT" },
    { name: "Jess L.", points: 9500, rank: 4, avatar: "JL" },
  ];

  const challenges = [
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
      progress: 3,
      total: 10,
      icon: Play,
      color: "accent",
    },
  ];

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
      <div className="max-w-md mx-auto space-y-6">
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
              {Math.floor(Math.random() * 500) + 200} online
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
                  <p className="text-xs text-muted-foreground">Grab them before they're gone!</p>
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
                <div key={i} className="flex-1 bg-background/60 backdrop-blur-sm p-3 rounded-xl text-center">
                  <p className="font-bold text-primary">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">{deal.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
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
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-32 overflow-hidden">
              {liveActivities.slice(0, 3).map((activity, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between text-sm py-1.5 animate-in slide-in-from-top-2"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {activity.user[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="text-foreground">{activity.task}</span>
                    </span>
                  </div>
                  <span className={`font-semibold ${activity.points > 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {activity.points > 0 ? '+' : ''}{activity.points}
                  </span>
                </div>
              ))}
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
              onStartTask={(task) => {
                console.log('Starting partnership task:', task);
                navigate('/earn');
              }}
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
                    <Badge className="bg-white/20 text-white mb-2 text-xs">🔥 Hot Right Now</Badge>
                    <CardTitle className="text-white text-xl mb-1">Weekend Warrior</CardTitle>
                    <CardDescription className="text-white/80 text-sm">
                      Complete 5 tasks for 2x points bonus!
                    </CardDescription>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                    <Rocket className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-3">
                  <Progress value={60} className="h-2 flex-1 bg-white/20" />
                  <span className="text-white text-sm font-medium">3/5</span>
                </div>
                <Button className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-5 rounded-2xl">
                  Continue Challenge
                </Button>
              </CardContent>
            </Card>

            {/* Trending Tasks Grid */}
            <div className="space-y-3">
              {trendingTasks?.map((task, index) => (
                <Card
                  key={task.id}
                  className="bg-card rounded-2xl border hover:shadow-hover transition-all duration-300 overflow-hidden"
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
                              <TrendingUp className="w-3 h-3" />
                              #{index + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleLike(task.id)}
                            >
                              <Heart 
                                className={`w-4 h-4 ${likedTasks.has(task.id) ? 'fill-destructive text-destructive' : ''}`} 
                              />
                            </Button>
                            <Button size="sm" className="h-8">
                              Start
                            </Button>
                          </div>
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
              const IconComponent = challenge.icon;
              const progress = Math.min((challenge.progress / challenge.total) * 100, 100);
              const isComplete = challenge.progress >= challenge.total;
              
              return (
                <Card
                  key={challenge.id}
                  className={`rounded-2xl border transition-all duration-300 ${
                    isComplete 
                      ? 'bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/30' 
                      : 'bg-card hover:shadow-hover'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`${
                        isComplete ? 'bg-green-500/20' : challenge.color === 'accent' ? 'bg-accent/10' : 'bg-primary/10'
                      } p-2.5 rounded-xl`}>
                        <IconComponent className={`w-5 h-5 ${
                          isComplete ? 'text-green-500' : challenge.color === 'accent' ? 'text-accent' : 'text-primary'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                              {challenge.title}
                              {isComplete && <Badge className="bg-green-500 text-xs">Complete!</Badge>}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {challenge.description}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-xs">
                            +{challenge.reward}
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {Math.min(challenge.progress, challenge.total)} / {challenge.total}
                            </span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={`h-2 ${isComplete ? 'bg-green-200' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            {/* Top Earners */}
            <Card className="bg-gradient-to-br from-accent/10 via-card to-primary/10 border rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="w-5 h-5 text-accent" />
                  Top Earners This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topEarners.map((earner, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        index === 0 
                          ? 'bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30' 
                          : 'bg-background/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-accent text-accent-foreground' :
                          index === 1 ? 'bg-muted-foreground/30 text-foreground' :
                          index === 2 ? 'bg-orange-400/30 text-orange-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {earner.rank}
                        </span>
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {earner.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{earner.name}</span>
                      </div>
                      <span className="font-bold text-primary">
                        {earner.points.toLocaleString()} pts
                      </span>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => navigate('/profile')}
                >
                  View Full Leaderboard
                </Button>
              </CardContent>
            </Card>

            {/* Your Ranking */}
            <Card className="bg-card border rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-xl">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Your Ranking</p>
                      <p className="text-xs text-muted-foreground">Keep earning to climb!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-2xl text-primary">#{42}</p>
                    <p className="text-xs text-muted-foreground">
                      {userProfile?.total_points?.toLocaleString() || 0} pts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
