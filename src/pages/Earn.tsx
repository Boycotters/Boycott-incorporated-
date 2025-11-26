import { Video, FileText, Share2, Star, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const tasks = [
  {
    id: 1,
    title: "Complete Daily Survey",
    description: "Answer 5 quick questions",
    points: 50,
    time: "2 min",
    icon: FileText,
    difficulty: "Easy",
    category: "Survey",
  },
  {
    id: 2,
    title: "Watch Sponsored Video",
    description: "Watch a 30-second video",
    points: 25,
    time: "30 sec",
    icon: Video,
    difficulty: "Easy",
    category: "Video",
  },
  {
    id: 3,
    title: "Invite 3 Friends",
    description: "Share referral link",
    points: 200,
    time: "5 min",
    icon: Share2,
    difficulty: "Medium",
    category: "Social",
  },
  {
    id: 4,
    title: "Rate Our App",
    description: "Leave a review on app store",
    points: 100,
    time: "1 min",
    icon: Star,
    difficulty: "Easy",
    category: "Review",
  },
];

export default function Earn() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Earn Points</h1>
          <p className="text-muted-foreground">Complete tasks to earn rewards</p>
        </div>

        {/* Daily Bonus */}
        <Card className="bg-gradient-accent p-6 rounded-3xl shadow-hover border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm font-medium mb-1">Daily Login Bonus</p>
              <h3 className="text-white text-2xl font-bold">+50 Points</h3>
            </div>
            <Button
              size="lg"
              className="bg-white text-accent hover:bg-white/90 font-bold rounded-2xl px-6"
            >
              Claim Now
            </Button>
          </div>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="bg-gradient-card p-5 rounded-3xl shadow-card border border-border hover:shadow-hover transition-all duration-300"
            >
              <div className="flex gap-4">
                <div className="bg-secondary p-3 rounded-2xl h-fit">
                  <task.icon className="w-6 h-6 text-secondary-foreground" />
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-base">{task.title}</h3>
                      <Badge
                        variant="secondary"
                        className="bg-accent/10 text-accent font-bold border-0 rounded-xl"
                      >
                        +{task.points}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="rounded-lg text-xs">
                        {task.time}
                      </Badge>
                      <Badge variant="outline" className="rounded-lg text-xs">
                        {task.difficulty}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-primary hover:bg-primary/90 rounded-2xl font-semibold">
                    Start Task
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Completed Tasks */}
        <div className="space-y-3 pt-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Completed Today</h3>
          <Card className="bg-muted/30 p-4 rounded-2xl border border-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Morning Check-in</p>
                <p className="text-xs text-muted-foreground">Completed 8:30 AM</p>
              </div>
              <span className="text-primary font-bold">+10</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
