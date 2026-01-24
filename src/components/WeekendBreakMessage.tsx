import { Calendar, Coffee, Sun, Moon, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface WeekendBreakMessageProps {
  className?: string;
  compact?: boolean;
}

export function WeekendBreakMessage({ className = "", compact = false }: WeekendBreakMessageProps) {
  if (compact) {
    return (
      <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 ${className}`}>
        <Coffee className="w-5 h-5 text-orange-500" />
        <div className="text-center">
          <p className="text-sm font-medium text-orange-600">Weekend Break!</p>
          <p className="text-xs text-muted-foreground">Tasks resume Monday</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-orange-500/10 via-yellow-500/5 to-amber-500/10 border-orange-500/20 overflow-hidden ${className}`}>
      <CardContent className="p-6 text-center">
        <div className="relative mb-4">
          <div className="flex justify-center gap-2 mb-2">
            <Sun className="w-6 h-6 text-yellow-500 animate-pulse" />
            <Moon className="w-5 h-5 text-orange-400" />
          </div>
          <Sparkles className="w-4 h-4 text-amber-400 absolute top-0 right-1/4 animate-bounce" />
        </div>
        
        <div className="bg-orange-500/10 p-4 rounded-2xl mb-4 inline-block">
          <Calendar className="w-12 h-12 text-orange-500 mx-auto" />
        </div>
        
        <h3 className="text-xl font-bold mb-2 text-orange-600">Weekend Break!</h3>
        <p className="text-muted-foreground mb-4">
          It's time to relax! Tasks, surveys, games, and videos are paused for the weekend.
        </p>
        
        <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Coffee className="w-4 h-4 text-orange-500" />
            <span className="font-medium">Tasks resume Monday at 12:00 AM</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Unless there's a special weekend campaign! 🎉
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
