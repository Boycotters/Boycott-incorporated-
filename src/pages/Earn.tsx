import { useState, useMemo } from "react";
import { 
  Video, FileText, Clock, Zap, Gamepad2, Heart, ShoppingBag, 
  BookOpen, Rocket, MessageCircle, Trophy, Sparkles, Camera, Link2,
  Flame, CheckCircle2, RotateCcw, AlertTriangle, Target, Lock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TaskVerificationModal } from "@/components/task-verification";

const iconMap: Record<string, any> = {
  social: MessageCircle,
  gaming: Gamepad2,
  lifestyle: Heart,
  shopping: ShoppingBag,
  learning: BookOpen,
  quick: Zap,
  challenge: Trophy,
  survey: FileText,
  video_ad: Video,
  app_install: Rocket,
};

const verificationIcons: Record<string, any> = {
  screenshot: Camera,
  url: Link2,
  timer: Clock,
  instant: Zap,
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
  category: string | null;
  difficulty: string | null;
  verification_type: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface LoginStreakResult {
  claimed: boolean;
  already_claimed_today: boolean;
  current_streak: number;
  longest_streak: number;
  bonus_points: number;
}

interface StreakRecoveryResult {
  success: boolean;
  error?: string;
  message: string;
  recovered_streak?: number;
  points_spent?: number;
}

const STREAK_RECOVERY_COST = 50;
const DAILY_TASK_LIMIT = 5; // Maximum tasks per day
export default function Earn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // Fetch user streak data
  const { data: userData } = useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('current_streak, longest_streak, last_login_date')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch wallet for recovery cost check
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('available_points')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check streak status
  const today = new Date().toISOString().split('T')[0];
  const hasClaimedToday = userData?.last_login_date === today;
  
  // Check if streak is broken (missed more than 1 day)
  const lastLogin = userData?.last_login_date ? new Date(userData.last_login_date) : null;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const isStreakBroken = lastLogin && 
    userData?.last_login_date !== today && 
    userData?.last_login_date !== yesterdayStr &&
    userData?.current_streak > 0;

  // Check if streak is recoverable (within 48 hours)
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const isStreakRecoverable = isStreakBroken && lastLogin && lastLogin >= twoDaysAgo;

  // Calculate potential bonus points (same formula as DB function)
  const currentStreak = userData?.current_streak || 0;
  const potentialBonus = 5 + Math.floor(Math.min(currentStreak + 1, 30) / 7) * 5;
  const availablePoints = wallet?.available_points || 0;
  const canAffordRecovery = availablePoints >= STREAK_RECOVERY_COST;

  // Claim daily bonus mutation
  const claimDailyBonus = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('check_login_streak', {
        p_user_id: user?.id
      });
      
      if (error) throw error;
      return data as unknown as LoginStreakResult;
    },
    onSuccess: (data) => {
      if (data.claimed) {
        toast({
          title: `Day ${data.current_streak} Streak! 🔥`,
          description: `You earned ${data.bonus_points} bonus points!`,
        });
      } else if (data.already_claimed_today) {
        toast({
          title: "Already Claimed",
          description: "Come back tomorrow to continue your streak!",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['user-streak'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Recover streak mutation
  const recoverStreak = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('recover_streak', {
        p_user_id: user?.id,
        p_recovery_cost: STREAK_RECOVERY_COST
      });
      
      if (error) throw error;
      return data as unknown as StreakRecoveryResult;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Streak Recovered! 🔄",
          description: `Your ${data.recovered_streak} day streak is saved! Now claim your daily bonus.`,
        });
      } else {
        toast({
          title: "Recovery Failed",
          description: data.message,
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['user-streak'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch available tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('points_reward', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
  });

  // Fetch user's completed tasks
  const { data: userTasks } = useQuery({
    queryKey: ['user-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('task_id, status, completed_at')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate tasks completed today
  const todayStart = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }, []);

  const tasksCompletedToday = useMemo(() => {
    if (!userTasks) return 0;
    return userTasks.filter(ut => 
      ut.status === 'completed' && 
      ut.completed_at && 
      new Date(ut.completed_at) >= new Date(todayStart)
    ).length;
  }, [userTasks, todayStart]);

  const remainingTasksToday = DAILY_TASK_LIMIT - tasksCompletedToday;
  const hasReachedDailyLimit = remainingTasksToday <= 0;
  const dailyProgress = Math.min((tasksCompletedToday / DAILY_TASK_LIMIT) * 100, 100);

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, proofUrl }: { taskId: string; proofUrl?: string }) => {
      const task = tasks?.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');

      // Create user_task record with proof
      const { data: userTask, error: userTaskError } = await supabase
        .from('user_tasks')
        .insert({
          user_id: user?.id,
          task_id: taskId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          proof_url: proofUrl || null,
          proof_submitted_at: proofUrl ? new Date().toISOString() : null,
        })
        .select('*, tasks(*)')
        .single();

      if (userTaskError) throw userTaskError;

      // Update points using the database function
      const { error: pointsError } = await supabase.rpc('update_user_points', {
        user_id: user?.id,
        points_to_add: task.points_reward,
      });

      if (pointsError) throw pointsError;

      return { userTask, points: task.points_reward };
    },
    onSuccess: (data) => {
      toast({
        title: "Task completed! 🎉",
        description: `You earned ${data.points} points!`,
      });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTaskClick = (task: Task) => {
    if (isTaskCompleted(task.id)) return;
    
    // Check daily limit
    if (hasReachedDailyLimit) {
      toast({
        title: "Daily Limit Reached",
        description: "Come back tomorrow for more tasks!",
      });
      return;
    }
    
    // All tasks now go through verification modal
    // This prevents users from just clicking without actually completing tasks
    setSelectedTask(task);
    setVerificationModalOpen(true);
  };

  const handleVerificationComplete = (taskId: string, proofUrl?: string) => {
    completeTaskMutation.mutate({ taskId, proofUrl });
  };

  const isTaskCompleted = (taskId: string) => {
    return userTasks?.some(ut => ut.task_id === taskId && ut.status === 'completed');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/10 text-green-500';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'hard':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getVerificationLabel = (type: string | null) => {
    switch (type) {
      case 'screenshot': return 'Screenshot';
      case 'url': return 'Link';
      case 'timer': return 'Timer';
      default: return 'Instant';
    }
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Earn Points</h1>
          <p className="text-muted-foreground">Complete tasks to earn rewards</p>
        </div>

        {/* Daily Task Progress */}
        <Card className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-semibold">Daily Tasks</span>
              </div>
              <Badge variant={hasReachedDailyLimit ? "secondary" : "default"} className="text-xs">
                {tasksCompletedToday}/{DAILY_TASK_LIMIT} completed
              </Badge>
            </div>
            <Progress value={dailyProgress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground text-center">
              {hasReachedDailyLimit 
                ? "🎉 Great job! Come back tomorrow for more tasks" 
                : `${remainingTasksToday} task${remainingTasksToday !== 1 ? 's' : ''} remaining today`
              }
            </p>
          </CardContent>
        </Card>

        {/* Streak Recovery Alert - Show when streak is broken but recoverable */}
        {isStreakRecoverable && (
          <Card className="bg-destructive/10 border-destructive/30 rounded-3xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-destructive/20 p-2 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg text-destructive">Streak Broken!</CardTitle>
                  <CardDescription className="text-destructive/80">
                    Your {currentStreak} day streak is at risk
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Recover your streak within 48 hours for <span className="font-bold text-destructive">{STREAK_RECOVERY_COST} points</span>
              </p>
              <Button 
                onClick={() => recoverStreak.mutate()}
                disabled={!canAffordRecovery || recoverStreak.isPending}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {recoverStreak.isPending 
                  ? "Recovering..." 
                  : canAffordRecovery 
                    ? `Recover Streak (-${STREAK_RECOVERY_COST} pts)` 
                    : `Need ${STREAK_RECOVERY_COST - availablePoints} more points`
                }
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Daily Login Bonus */}
        <Card className="bg-gradient-primary border-0 rounded-3xl overflow-hidden shadow-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-2xl mb-1">Daily Login Bonus</CardTitle>
                <CardDescription className="text-white/80">
                  {hasClaimedToday 
                    ? `Day ${currentStreak} streak! Come back tomorrow` 
                    : isStreakRecoverable
                      ? "Recover your streak first!"
                      : `Claim your Day ${currentStreak + 1} reward`
                  }
                </CardDescription>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                <Flame className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Streak Stats */}
            <div className="flex items-center justify-between text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                <span>Current Streak: {currentStreak} days</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>Best: {userData?.longest_streak || 0}</span>
              </div>
            </div>
            
            <Button 
              onClick={() => claimDailyBonus.mutate()}
              disabled={hasClaimedToday || claimDailyBonus.isPending || isStreakRecoverable}
              className={`w-full font-semibold py-6 rounded-2xl transition-all ${
                hasClaimedToday || isStreakRecoverable
                  ? "bg-white/30 text-white/70 cursor-not-allowed" 
                  : "bg-white text-primary hover:bg-white/90"
              }`}
            >
              {hasClaimedToday ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Claimed Today
                </span>
              ) : isStreakRecoverable ? (
                "Recover streak to claim"
              ) : claimDailyBonus.isPending ? (
                "Claiming..."
              ) : (
                `Claim +${potentialBonus} Points`
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Available Tasks */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Tasks</h2>
          
          {tasks?.map((task) => {
            const IconComponent = iconMap[task.category || 'quick'] || Sparkles;
            const VerifyIcon = verificationIcons[task.verification_type || 'instant'] || Zap;
            const completed = isTaskCompleted(task.id);
            const isLocked = hasReachedDailyLimit && !completed;
            
            return (
              <Card 
                key={task.id} 
                className={`bg-gradient-card rounded-2xl shadow-card border border-border transition-all duration-300 ${
                  isLocked ? "opacity-60" : "hover:shadow-hover"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2.5 rounded-xl ${isLocked ? "bg-muted" : "bg-primary/10"}`}>
                        {isLocked ? (
                          <Lock className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <IconComponent className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{task.title}</CardTitle>
                        <CardDescription className="text-sm">{task.description}</CardDescription>
                      </div>
                    </div>
                    <span className={`font-bold text-lg whitespace-nowrap ml-2 ${isLocked ? "text-muted-foreground" : "text-accent"}`}>
                      +{task.points_reward}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.difficulty && (
                        <Badge variant="secondary" className={getDifficultyColor(task.difficulty)}>
                          {task.difficulty}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs gap-1">
                        <VerifyIcon className="w-3 h-3" />
                        {getVerificationLabel(task.verification_type)}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleTaskClick(task)}
                      disabled={completed || completeTaskMutation.isPending || isLocked}
                      className={
                        completed 
                          ? "bg-green-500/20 text-green-500 hover:bg-green-500/20" 
                          : isLocked
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary hover:bg-primary/90"
                      }
                    >
                      {completed 
                        ? "Completed ✓" 
                        : isLocked 
                          ? "Tomorrow" 
                          : completeTaskMutation.isPending 
                            ? "Processing..." 
                            : "Start Task"
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Verification Modal */}
      <TaskVerificationModal
        open={verificationModalOpen}
        onOpenChange={setVerificationModalOpen}
        task={selectedTask ? {
          id: selectedTask.id,
          title: selectedTask.title,
          verification_type: selectedTask.verification_type || 'instant',
          points_reward: selectedTask.points_reward,
        } : null}
        userId={user?.id || ''}
        onVerificationComplete={handleVerificationComplete}
      />
    </div>
  );
}
