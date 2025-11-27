import { TrendingUp, Target, Trophy, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Discover() {
  const { user } = useAuth();

  // Fetch trending tasks (high point tasks)
  const { data: trendingTasks, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('points_reward', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's task completion stats for challenges
  const { data: completionStats } = useQuery({
    queryKey: ['completion-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('status')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      const completed = data.filter(t => t.status === 'completed').length;
      return { completed, total: 20 }; // Example challenge goals
    },
    enabled: !!user?.id,
  });

  const challenges = [
    {
      id: 1,
      title: "Task Master",
      description: "Complete 20 tasks this month",
      reward: "500 bonus points",
      progress: completionStats?.completed || 0,
      total: completionStats?.total || 20,
      icon: Target,
    },
    {
      id: 2,
      title: "Point Collector",
      description: "Earn 5,000 points total",
      reward: "1,000 bonus points",
      progress: 3200,
      total: 5000,
      icon: Trophy,
    },
    {
      id: 3,
      title: "Daily Streak",
      description: "Complete tasks 7 days in a row",
      reward: "300 bonus points",
      progress: 4,
      total: 7,
      icon: TrendingUp,
    },
  ];

  if (trendingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Discover</h1>
          <p className="text-muted-foreground">Explore trending tasks and challenges</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4">
            {/* Hero Challenge */}
            <Card className="bg-gradient-primary border-0 rounded-3xl overflow-hidden shadow-hover">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white mb-3">🔥 Hot Challenge</Badge>
                    <CardTitle className="text-white text-2xl mb-2">Weekend Bonus</CardTitle>
                    <CardDescription className="text-white/80">
                      Complete 5 tasks this weekend for 2x points!
                    </CardDescription>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl">
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Trending Tasks */}
            <div className="space-y-3">
              {trendingTasks?.map((task) => (
                <Card
                  key={task.id}
                  className="bg-gradient-card rounded-2xl shadow-card border border-border hover:shadow-hover transition-all duration-300"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-primary/10 p-2.5 rounded-xl">
                          <Video className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1">{task.title}</CardTitle>
                          <CardDescription className="text-sm">{task.description}</CardDescription>
                        </div>
                      </div>
                      <span className="text-accent font-bold text-lg whitespace-nowrap ml-2">
                        +{task.points_reward}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {task.difficulty && (
                          <Badge variant="secondary" className="text-xs">
                            {task.difficulty}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Trending
                        </span>
                      </div>
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-4">
            {challenges.map((challenge) => {
              const IconComponent = challenge.icon;
              const progress = (challenge.progress / challenge.total) * 100;
              
              return (
                <Card
                  key={challenge.id}
                  className="bg-gradient-card rounded-2xl shadow-card border border-border hover:shadow-hover transition-all duration-300"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-accent/10 p-2.5 rounded-xl">
                        <IconComponent className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{challenge.title}</CardTitle>
                        <CardDescription>{challenge.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">
                          {challenge.progress} / {challenge.total}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                        Reward: {challenge.reward}
                      </Badge>
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}