import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, CalendarDays, Flame, Trophy, Star, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { subDays, isSameDay, startOfDay } from "date-fns";

interface DataVerificationProps {
  taskId: string;
  userId: string;
  taskTitle: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface UserData {
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
  total_points: number;
  level: number;
}

export function DataVerification({
  taskId,
  userId,
  taskTitle,
  onComplete,
  onCancel,
}: DataVerificationProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [requirement, setRequirement] = useState<{ type: string; value: number } | null>(null);

  useEffect(() => {
    fetchUserData();
    parseTaskRequirement();
  }, [userId, taskTitle]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('current_streak, longest_streak, last_login_date, total_points, level')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseTaskRequirement = () => {
    const title = taskTitle.toLowerCase();
    
    // Parse streak requirements
    const streakMatch = title.match(/(\d+)\s*day\s*streak/i);
    if (streakMatch) {
      setRequirement({ type: 'streak', value: parseInt(streakMatch[1]) });
      return;
    }

    // Parse login requirements
    if (title.includes('login') || title.includes('daily')) {
      setRequirement({ type: 'login', value: 1 });
      return;
    }

    // Parse level requirements
    const levelMatch = title.match(/level\s*(\d+)/i);
    if (levelMatch) {
      setRequirement({ type: 'level', value: parseInt(levelMatch[1]) });
      return;
    }

    // Parse points requirements
    const pointsMatch = title.match(/(\d+)\s*points/i);
    if (pointsMatch) {
      setRequirement({ type: 'points', value: parseInt(pointsMatch[1]) });
      return;
    }

    // Default: just verify login
    setRequirement({ type: 'login', value: 1 });
  };

  const getProgressData = (): { current: number; target: number; percentage: number; remaining: string } => {
    if (!userData || !requirement) {
      return { current: 0, target: 1, percentage: 0, remaining: "" };
    }

    switch (requirement.type) {
      case 'streak':
        const streakProgress = Math.min((userData.current_streak / requirement.value) * 100, 100);
        const streakRemaining = requirement.value - userData.current_streak;
        return {
          current: userData.current_streak,
          target: requirement.value,
          percentage: streakProgress,
          remaining: streakRemaining > 0 ? `${streakRemaining} more day${streakRemaining > 1 ? 's' : ''} needed` : ""
        };

      case 'level':
        const levelProgress = Math.min((userData.level / requirement.value) * 100, 100);
        const levelRemaining = requirement.value - userData.level;
        return {
          current: userData.level,
          target: requirement.value,
          percentage: levelProgress,
          remaining: levelRemaining > 0 ? `${levelRemaining} more level${levelRemaining > 1 ? 's' : ''} needed` : ""
        };

      case 'points':
        const pointsProgress = Math.min((userData.total_points / requirement.value) * 100, 100);
        const pointsRemaining = requirement.value - userData.total_points;
        return {
          current: userData.total_points,
          target: requirement.value,
          percentage: pointsProgress,
          remaining: pointsRemaining > 0 ? `${pointsRemaining.toLocaleString()} more points needed` : ""
        };

      case 'login':
      default:
        return { current: 1, target: 1, percentage: 100, remaining: "" };
    }
  };

  const checkVerification = (): { passed: boolean; message: string } => {
    if (!userData || !requirement) {
      return { passed: false, message: "Unable to verify data" };
    }

    switch (requirement.type) {
      case 'streak':
        if (userData.current_streak >= requirement.value) {
          return { passed: true, message: `You have a ${userData.current_streak} day streak!` };
        }
        return { 
          passed: false, 
          message: `You need a ${requirement.value} day streak. Current: ${userData.current_streak} days` 
        };

      case 'level':
        if (userData.level >= requirement.value) {
          return { passed: true, message: `You're level ${userData.level}!` };
        }
        return { 
          passed: false, 
          message: `You need level ${requirement.value}. Current: Level ${userData.level}` 
        };

      case 'points':
        if (userData.total_points >= requirement.value) {
          return { passed: true, message: `You have ${userData.total_points} points!` };
        }
        return { 
          passed: false, 
          message: `You need ${requirement.value} points. Current: ${userData.total_points}` 
        };

      case 'login':
      default:
        const today = startOfDay(new Date());
        const lastLogin = userData.last_login_date ? startOfDay(new Date(userData.last_login_date)) : null;
        
        if (lastLogin && isSameDay(today, lastLogin)) {
          return { passed: true, message: "You're logged in today!" };
        }
        return { passed: true, message: "Login verified!" };
    }
  };

  const verification = checkVerification();
  const progress = getProgressData();

  // Generate calendar dates for visualization
  const getStreakDates = () => {
    if (!userData?.current_streak) return [];
    const dates: Date[] = [];
    const today = new Date();
    
    for (let i = 0; i < userData.current_streak; i++) {
      dates.push(subDays(today, i));
    }
    return dates;
  };

  const streakDates = getStreakDates();

  const handleClaim = () => {
    if (verification.passed) {
      setVerified(true);
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-muted-foreground">Verifying your progress...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      {/* Verification Status */}
      <div className={cn(
        "w-full p-4 rounded-2xl text-center transition-all duration-300",
        verification.passed 
          ? "bg-green-500/10 border border-green-500/20" 
          : "bg-destructive/10 border border-destructive/20"
      )}>
        <div className="flex items-center justify-center gap-2 mb-2">
          {verification.passed ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <XCircle className="w-6 h-6 text-destructive" />
          )}
          <span className={cn(
            "font-semibold",
            verification.passed ? "text-green-500" : "text-destructive"
          )}>
            {verification.passed ? "Verified!" : "Not Yet Complete"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{verification.message}</p>
      </div>

      {/* Progress Bar - Only show when not verified */}
      {!verification.passed && requirement && requirement.type !== 'login' && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Your Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.target}
            </span>
          </div>
          
          <div className="relative">
            <Progress 
              value={progress.percentage} 
              className="h-4 bg-muted"
            />
            <div 
              className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
              style={{ 
                color: progress.percentage > 50 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))' 
              }}
            >
              {Math.round(progress.percentage)}%
            </div>
          </div>
          
          {progress.remaining && (
            <p className="text-xs text-muted-foreground text-center bg-muted/50 py-2 px-3 rounded-lg">
              {progress.remaining}
            </p>
          )}
        </div>
      )}

      {/* Stats Display */}
      {userData && (
        <div className="grid grid-cols-3 gap-3 w-full">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{userData.current_streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{userData.longest_streak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Star className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{userData.level}</p>
            <p className="text-xs text-muted-foreground">Level</p>
          </div>
        </div>
      )}

      {/* Calendar for Streak Visualization */}
      {requirement?.type === 'streak' && (
        <div className="w-full">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Your Login History</span>
          </div>
          <Calendar
            mode="multiple"
            selected={streakDates}
            className="rounded-xl border bg-card p-3"
            disabled
            modifiers={{
              streak: streakDates,
            }}
            modifiersStyles={{
              streak: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                borderRadius: '50%',
              }
            }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={verified}
        >
          Cancel
        </Button>
        <Button
          onClick={handleClaim}
          disabled={!verification.passed || verified}
          className={cn(
            "flex-1 transition-all",
            verified && "bg-green-500 hover:bg-green-500"
          )}
        >
          {verified ? "Claimed! ✓" : verification.passed ? "Claim Reward" : "Keep Going"}
        </Button>
      </div>
    </div>
  );
}
