import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Video, FileText, Clock, Zap, Gamepad2, Heart, ShoppingBag, 
  BookOpen, Rocket, MessageCircle, Trophy, Sparkles, Camera, Link2,
  Flame, CheckCircle2, RotateCcw, AlertTriangle, Target, Lock, Timer, Award, ChevronRight,
  Calendar, PartyPopper
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
import { useConfetti } from "@/hooks/useConfetti";

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
const BASE_DAILY_TASK_LIMIT = 5; // Base tasks per day

interface VipTier {
  slug: string;
  name: string;
  icon: string;
  daily_task_bonus: number;
  upgrade_cost: number;
  min_points: number;
}

interface TierUpgradeResult {
  success: boolean;
  error?: string;
  message: string;
  new_tier?: string;
  points_spent?: number;
  daily_task_bonus?: number;
}

interface TaskAvailability {
  available: boolean;
  is_weekend: boolean;
  has_campaign: boolean;
  campaign_name?: string;
  bonus_multiplier?: number;
  message: string;
  new_tier?: string;
  points_spent?: number;
  daily_task_bonus?: number;
}

export default function Earn() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState("");
  const { fireConfetti, fireStreakConfetti, fireMilestoneConfetti, fireTierUpgradeConfetti } = useConfetti();

  // Countdown timer to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Fetch user data including VIP tier
  const { data: userData } = useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('current_streak, longest_streak, last_login_date, vip_tier')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if tasks are available today (weekday/weekend logic)
  const { data: taskAvailability } = useQuery({
    queryKey: ['task-availability'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('are_tasks_available_today');
      if (error) throw error;
      return data as unknown as TaskAvailability;
    },
  });

  // Fetch VIP tiers
  const { data: vipTiers } = useQuery({
    queryKey: ['vip-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_tiers')
        .select('slug, name, icon, daily_task_bonus, upgrade_cost, min_points')
        .order('min_points', { ascending: true });
      
      if (error) throw error;
      return data as VipTier[];
    },
  });

  // Get current tier data
  const currentTier = useMemo(() => {
    if (!vipTiers || !userData?.vip_tier) return null;
    return vipTiers.find(t => t.slug === userData.vip_tier);
  }, [vipTiers, userData?.vip_tier]);

  // Get next available tier for upgrade
  const nextTier = useMemo(() => {
    if (!vipTiers || !currentTier) return null;
    const currentIndex = vipTiers.findIndex(t => t.slug === currentTier.slug);
    return vipTiers[currentIndex + 1] || null;
  }, [vipTiers, currentTier]);

  // Calculate daily task limit based on tier
  const dailyTaskLimit = BASE_DAILY_TASK_LIMIT + (currentTier?.daily_task_bonus || 0);

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
      
      // Also check for streak milestones
      const { data: milestoneData } = await supabase.rpc('check_streak_milestones', {
        p_user_id: user?.id
      });
      
      return { 
        loginData: data as unknown as LoginStreakResult,
        milestoneData: milestoneData as unknown as { milestones_awarded: Array<{days: number, bonus: number}>, total_bonus: number }
      };
    },
    onSuccess: ({ loginData, milestoneData }) => {
      if (loginData.claimed) {
        fireStreakConfetti();
        toast({
          title: `Day ${loginData.current_streak} Streak! 🔥`,
          description: `You earned ${loginData.bonus_points} bonus points!`,
        });
        
        // Check if milestones were awarded
        if (milestoneData?.total_bonus > 0) {
          setTimeout(() => {
            fireMilestoneConfetti();
            toast({
              title: "🏆 Milestone Achieved!",
              description: `You earned ${milestoneData.total_bonus} bonus points for your streak milestone!`,
            });
          }, 1500);
        }
      } else if (loginData.already_claimed_today) {
        toast({
          title: "Already Claimed",
          description: "Come back tomorrow to continue your streak!",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['user-streak'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['streak-milestones'] });
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

  // Tier upgrade mutation
  const upgradeTier = useMutation({
    mutationFn: async (targetTier: string) => {
      const { data, error } = await supabase.rpc('purchase_tier_upgrade', {
        p_user_id: user?.id,
        p_target_tier: targetTier
      });
      
      if (error) throw error;
      return data as unknown as TierUpgradeResult;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: `${data.message} 🎉`,
          description: `You now have +${data.daily_task_bonus} extra daily tasks!`,
        });
        fireTierUpgradeConfetti();
        setShowUpgradeModal(false);
      } else {
        toast({
          title: "Upgrade Failed",
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

  // Fetch user's earned streak milestones
  const { data: earnedMilestones } = useQuery({
    queryKey: ['streak-milestones', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streak_milestones')
        .select('milestone_days, bonus_points')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const MILESTONES = [
    { days: 7, bonus: 50 },
    { days: 14, bonus: 100 },
    { days: 30, bonus: 250 },
  ];

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

  const remainingTasksToday = dailyTaskLimit - tasksCompletedToday;
  const hasReachedDailyLimit = remainingTasksToday <= 0;
  const dailyProgress = Math.min((tasksCompletedToday / dailyTaskLimit) * 100, 100);

  // Complete task mutation - now using secure server-side function
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, proofUrl, verificationData }: { taskId: string; proofUrl?: string; verificationData?: Record<string, any> }) => {
      const task = tasks?.find(t => t.id === taskId);
      if (!task) throw new Error('Task not found');

      // Use secure server-side function for task completion
      const { data: result, error } = await supabase.rpc('secure_complete_task', {
        p_user_id: user?.id,
        p_task_id: taskId,
        p_verification_data: {
          ...verificationData,
          file_path: proofUrl || null,
          submitted_url: verificationData?.submitted_url || null,
        }
      });

      if (error) throw error;
      
      const typedResult = result as { success: boolean; message: string; points?: number; already_completed?: boolean };
      
      if (!typedResult.success) {
        throw new Error(typedResult.message);
      }

      return { points: typedResult.points || task.points_reward };
    },
    onSuccess: (data) => {
      fireConfetti();
      toast({
        title: "Task completed! 🎉",
        description: `You earned ${data.points} points!`,
      });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-activity-status'] });
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
    
    // Check weekend block
    if (taskAvailability && !taskAvailability.available && taskAvailability.is_weekend) {
      toast({
        title: "Weekend Break",
        description: "Tasks are available Monday-Friday. Check back on Monday!",
      });
      return;
    }
    
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

  const handleVerificationComplete = (taskId: string, proofUrl?: string, verificationData?: Record<string, any>) => {
    completeTaskMutation.mutate({ taskId, proofUrl, verificationData });
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

  // Determine if tasks are blocked due to weekend
  const isWeekendBlocked = taskAvailability && !taskAvailability.available && taskAvailability.is_weekend;
  const hasWeekendCampaign = taskAvailability?.has_campaign && taskAvailability?.is_weekend;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Earn Points</h1>
          <p className="text-muted-foreground">Complete tasks to earn rewards</p>
        </div>

        {/* Weekend Campaign Banner */}
        {hasWeekendCampaign && (
          <Card className="bg-gradient-to-r from-violet-500 to-fuchsia-500 border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <PartyPopper className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{taskAvailability?.campaign_name || 'Weekend Campaign'}</h3>
                  <p className="text-sm text-white/80">
                    {taskAvailability?.bonus_multiplier && taskAvailability.bonus_multiplier > 1 
                      ? `${taskAvailability.bonus_multiplier}x bonus points active!` 
                      : 'Special weekend tasks available!'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekend Off Notice */}
        {isWeekendBlocked && (
          <Card className="bg-secondary/50 border border-border rounded-2xl overflow-hidden">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Weekend Break</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Tasks are available Monday-Friday. Enjoy your weekend and check back on Monday!
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Special weekend campaigns may unlock bonus tasks
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Task Progress */}
        <Card className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-semibold">Daily Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={hasReachedDailyLimit ? "secondary" : "default"} className="text-xs">
                  {tasksCompletedToday}/{dailyTaskLimit} completed
                </Badge>
              </div>
            </div>
            
            <Progress value={dailyProgress} className="h-2" />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {hasReachedDailyLimit 
                  ? "🎉 Come back tomorrow" 
                  : `${remainingTasksToday} task${remainingTasksToday !== 1 ? 's' : ''} left`
                }
              </span>
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                <span>Resets in {timeUntilReset}</span>
              </div>
            </div>

            {/* Tier Info & Upgrade */}
            {currentTier && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentTier.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{currentTier.name} Tier</p>
                    <p className="text-xs text-muted-foreground">
                      {currentTier.daily_task_bonus > 0 
                        ? `+${currentTier.daily_task_bonus} bonus tasks/day` 
                        : "Base limit"
                      }
                    </p>
                  </div>
                </div>
                {nextTier && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      if (availablePoints >= nextTier.upgrade_cost) {
                        upgradeTier.mutate(nextTier.slug);
                      } else {
                        toast({
                          title: "Not enough points",
                          description: `You need ${nextTier.upgrade_cost} points to upgrade to ${nextTier.name}`,
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={upgradeTier.isPending}
                    className="text-xs"
                  >
                    {upgradeTier.isPending ? "Upgrading..." : (
                      <>
                        <span className="mr-1">{nextTier.icon}</span>
                        Upgrade ({nextTier.upgrade_cost} pts)
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streak Milestones */}
        <Card className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold">Streak Milestones</span>
            </div>
            
            <div className="flex justify-between gap-2">
              {MILESTONES.map((milestone) => {
                const isEarned = earnedMilestones?.some(m => m.milestone_days === milestone.days);
                const isNext = currentStreak < milestone.days && !isEarned;
                const progress = isNext ? Math.min((currentStreak / milestone.days) * 100, 100) : 0;
                
                return (
                  <div 
                    key={milestone.days}
                    className={`flex-1 text-center p-3 rounded-xl border transition-all ${
                      isEarned 
                        ? "bg-yellow-500/10 border-yellow-500/30" 
                        : isNext 
                          ? "bg-primary/5 border-primary/20" 
                          : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className={`text-2xl mb-1 ${isEarned ? "" : "grayscale opacity-50"}`}>
                      {milestone.days === 7 ? "🥉" : milestone.days === 14 ? "🥈" : "🥇"}
                    </div>
                    <p className="text-xs font-medium">{milestone.days} Days</p>
                    <p className={`text-xs ${isEarned ? "text-yellow-500" : "text-muted-foreground"}`}>
                      {isEarned ? "Earned!" : `+${milestone.bonus} pts`}
                    </p>
                    {isNext && !isEarned && (
                      <div className="mt-1">
                        <Progress value={progress} className="h-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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

        {/* Surveys Quick Access */}
        <Card 
          className="bg-gradient-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
          onClick={() => navigate('/surveys')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Surveys</h3>
                  <p className="text-sm text-muted-foreground">Answer AI-generated surveys for points</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Videos Quick Access */}
        <Card 
          className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-all"
          onClick={() => navigate('/videos')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Watch & Earn</h3>
                  <p className="text-sm text-white/80">Watch short videos for quick points</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </div>
          </CardContent>
        </Card>

        {/* Games Quick Access */}
        <Card 
          className="bg-gradient-to-r from-amber-500 to-orange-500 border-0 rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-all"
          onClick={() => navigate('/games')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Play & Earn</h3>
                  <p className="text-sm text-white/80">Win points with fun mini games</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </div>
          </CardContent>
        </Card>

        {/* Available Tasks */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Tasks</h2>
          
          {(tasks || []).map((task) => {
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
