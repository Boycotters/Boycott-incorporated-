import { Trophy, TrendingUp, Target, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Home() {
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
              <h2 className="text-white text-4xl font-bold">2,450</h2>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-2xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/90 font-medium">Level 5</span>
              <span className="text-white/90">78% to Level 6</span>
            </div>
            <Progress value={78} className="mt-2 h-2 bg-white/20" />
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
            <p className="text-2xl font-bold">+320</p>
            <p className="text-xs text-muted-foreground mt-1">Points earned</p>
          </Card>

          <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-accent/10 p-2 rounded-xl">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <span className="text-muted-foreground text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold">12/15</p>
            <p className="text-xs text-muted-foreground mt-1">Today's tasks</p>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          
          {[
            { title: "Daily Survey", points: "+50", time: "2 hours ago", icon: Clock },
            { title: "Watch Video", points: "+25", time: "5 hours ago", icon: Clock },
            { title: "Share App", points: "+100", time: "Yesterday", icon: Clock },
          ].map((activity, index) => (
            <Card
              key={index}
              className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border hover:shadow-hover transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-secondary p-2 rounded-xl">
                    <activity.icon className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
                <span className="text-accent font-bold text-lg">{activity.points}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
