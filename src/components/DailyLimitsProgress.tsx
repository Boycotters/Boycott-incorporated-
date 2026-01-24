import { useAuth } from "@/hooks/useAuth";
import { useDailyLimits } from "@/hooks/useDailyLimits";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, FileText, Video, Gamepad2, Target, CheckCircle2, Lock, Handshake, Calendar } from "lucide-react";

interface DailyLimitsProgressProps {
  variant?: "compact" | "full";
  className?: string;
}

export function DailyLimitsProgress({ variant = "full", className = "" }: DailyLimitsProgressProps) {
  const { user } = useAuth();
  const { data, isLoading, hasReachedDailyCap, totalPointsEarned, maxDailyPoints, isWeekendBlocked } = useDailyLimits();

  if (isLoading || !user || !data) {
    return null;
  }

  const progressPercent = (totalPointsEarned / maxDailyPoints) * 100;

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1">
          <Progress value={progressPercent} className="h-2" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {totalPointsEarned}/{maxDailyPoints} pts
        </span>
        {hasReachedDailyCap && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            <CheckCircle2 className="w-3 h-3 mr-0.5" />
            Complete
          </Badge>
        )}
      </div>
    );
  }

  const activities = [
    { 
      key: 'partnered_tasks', 
      label: 'Partnered', 
      icon: Handshake, 
      data: data.partnered_tasks,
      color: 'text-purple-500 bg-purple-500/10'
    },
    { 
      key: 'regular_tasks', 
      label: 'Tasks', 
      icon: Target, 
      data: data.regular_tasks,
      color: 'text-yellow-500 bg-yellow-500/10'
    },
    { 
      key: 'surveys', 
      label: 'Surveys', 
      icon: FileText, 
      data: data.surveys,
      color: 'text-blue-500 bg-blue-500/10'
    },
    { 
      key: 'videos', 
      label: 'Ads', 
      icon: Video, 
      data: data.videos,
      color: 'text-green-500 bg-green-500/10'
    },
    { 
      key: 'games', 
      label: 'Games', 
      icon: Gamepad2, 
      data: data.games,
      color: 'text-orange-500 bg-orange-500/10'
    },
  ];

  return (
    <Card className={`bg-gradient-card p-4 rounded-2xl shadow-card border border-border ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Daily Progress</h3>
        <div className="flex items-center gap-2">
          {data.has_campaign && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-accent text-accent">
              <Calendar className="w-3 h-3 mr-0.5" />
              Campaign
            </Badge>
          )}
          <Badge variant={hasReachedDailyCap ? "default" : "secondary"} className="text-xs">
            {totalPointsEarned}/{maxDailyPoints} pts
          </Badge>
        </div>
      </div>
      
      <Progress value={progressPercent} className="h-2.5 mb-4" />
      
      <div className="grid grid-cols-5 gap-2">
        {activities.map(({ key, label, icon: Icon, data: actData, color }) => {
          const isComplete = actData.remaining <= 0;
          return (
            <div 
              key={key} 
              className={`flex flex-col items-center p-2 rounded-lg ${isComplete ? 'bg-muted/50' : 'bg-secondary/30'}`}
            >
              <div className={`p-1.5 rounded-lg mb-1 ${color}`}>
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
              <span className={`text-[10px] ${isComplete ? 'text-muted-foreground' : 'text-primary'}`}>
                {actData.completed}/{actData.max}
              </span>
            </div>
          );
        })}
      </div>

      {isWeekendBlocked && (
        <div className="mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-orange-500/10">
          <Calendar className="w-4 h-4 text-orange-500" />
          <span className="text-xs text-orange-600 font-medium">Weekend Break! Tasks resume Monday.</span>
        </div>
      )}

      {hasReachedDailyCap && !isWeekendBlocked && (
        <div className="mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary font-medium">Daily limit reached! Come back tomorrow.</span>
        </div>
      )}
    </Card>
  );
}
