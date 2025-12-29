import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Target, RefreshCw, Zap, Clock, Trophy } from "lucide-react";
import { useAI, RecommendationsResult, TaskRecommendation } from "@/hooks/useAI";
import { cn } from "@/lib/utils";

interface TaskRecommendationsProps {
  userLevel: number;
  completedCategories: string[];
  interests: string[];
  vipTier: string;
  onSelectCategory?: (category: string) => void;
}

const difficultyConfig = {
  easy: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: Zap },
  medium: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  hard: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: Trophy },
};

export function TaskRecommendations({
  userLevel,
  completedCategories,
  interests,
  vipTier,
  onSelectCategory
}: TaskRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendationsResult | null>(null);
  const { recommendTasks, loading, error } = useAI();

  const loadRecommendations = async () => {
    const result = await recommendTasks(userLevel, completedCategories, interests, vipTier);
    if (result) {
      setRecommendations(result);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [userLevel, vipTier]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <CardTitle className="text-base">AI Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error || !recommendations) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Unable to load recommendations
          </p>
          <Button variant="outline" size="sm" onClick={loadRecommendations}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">AI Recommendations</CardTitle>
              <p className="text-xs text-muted-foreground">Personalized for you</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={loadRecommendations}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Daily Focus */}
        <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Today's Focus</span>
          </div>
          <p className="text-sm font-medium">{recommendations.dailyFocus}</p>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          {recommendations.recommendations.slice(0, 4).map((rec, index) => {
            const DiffIcon = difficultyConfig[rec.difficulty].icon;
            
            return (
              <div
                key={index}
                className="group p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer"
                onClick={() => onSelectCategory?.(rec.category)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{rec.taskType}</span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs capitalize shrink-0", difficultyConfig[rec.difficulty].color)}
                      >
                        <DiffIcon className="w-3 h-3 mr-1" />
                        {rec.difficulty}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{rec.reason}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {rec.pointsRange}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
