import { TrendingUp, Flame, Users, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const trendingTasks = [
  {
    id: 1,
    title: "Fitness Challenge",
    description: "Walk 10,000 steps",
    points: 150,
    participants: 2345,
    icon: "🏃",
    trending: true,
  },
  {
    id: 2,
    title: "Recipe Share",
    description: "Share your favorite recipe",
    points: 75,
    participants: 1230,
    icon: "🍳",
    trending: true,
  },
  {
    id: 3,
    title: "Photo Contest",
    description: "Best sunset photo",
    points: 200,
    participants: 3456,
    icon: "📸",
    trending: false,
  },
];

const challenges = [
  {
    id: 1,
    title: "7-Day Streak",
    description: "Login daily for a week",
    reward: "500 bonus points",
    progress: 4,
    total: 7,
    icon: Flame,
  },
  {
    id: 2,
    title: "Task Master",
    description: "Complete 50 tasks",
    reward: "Premium badge",
    progress: 32,
    total: 50,
    icon: Award,
  },
];

export default function Discover() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Discover</h1>
          <p className="text-muted-foreground">Explore trending tasks & challenges</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted p-1">
            <TabsTrigger value="trending" className="rounded-xl">
              Trending
            </TabsTrigger>
            <TabsTrigger value="challenges" className="rounded-xl">
              Challenges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-4 mt-6">
            {/* Hero Card */}
            <Card className="bg-gradient-primary p-6 rounded-3xl shadow-hover border-0">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-white" />
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 rounded-xl">
                  Hot Right Now
                </Badge>
              </div>
              <h3 className="text-white text-2xl font-bold mb-2">Weekend Challenge</h3>
              <p className="text-white/80 mb-4">Complete 10 tasks this weekend for 3x points!</p>
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-bold rounded-2xl w-full"
              >
                Join Challenge
              </Button>
            </Card>

            {/* Trending Tasks */}
            {trendingTasks.map((task) => (
              <Card
                key={task.id}
                className="bg-gradient-card p-5 rounded-3xl shadow-card border border-border hover:shadow-hover transition-all duration-300"
              >
                <div className="flex gap-4">
                  <div className="bg-secondary p-4 rounded-2xl h-fit text-3xl flex items-center justify-center w-20 h-20">
                    {task.icon}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-base">{task.title}</h3>
                        {task.trending && (
                          <Badge className="bg-accent text-accent-foreground border-0 rounded-xl flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Hot
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {task.participants.toLocaleString()} participants
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg text-accent">+{task.points} pts</span>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 rounded-xl font-semibold"
                      >
                        Join Now
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="challenges" className="space-y-4 mt-6">
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <Card
                  key={challenge.id}
                  className="bg-gradient-card p-5 rounded-3xl shadow-card border border-border"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-accent/10 p-3 rounded-2xl">
                      <challenge.icon className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{challenge.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                      <Badge variant="secondary" className="rounded-xl">
                        {challenge.reward}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">
                        {challenge.progress}/{challenge.total}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(challenge.progress / challenge.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
