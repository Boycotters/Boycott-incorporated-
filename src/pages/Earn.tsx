import { useState } from "react";
import { 
  Video, FileText, Share2, Clock, Zap, Gamepad2, Heart, ShoppingBag, 
  BookOpen, Rocket, MessageCircle, Trophy, Sparkles, Camera, Link2 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function Earn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

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
        .select('task_id, status')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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

        {/* Daily Login Bonus */}
        <Card className="bg-gradient-primary border-0 rounded-3xl overflow-hidden shadow-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-2xl mb-1">Daily Login Bonus</CardTitle>
                <CardDescription className="text-white/80">Claim your daily reward</CardDescription>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl">
              Claim 50 Points
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
            
            return (
              <Card key={task.id} className="bg-gradient-card rounded-2xl shadow-card border border-border hover:shadow-hover transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-primary/10 p-2.5 rounded-xl">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{task.title}</CardTitle>
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
                      disabled={completed || completeTaskMutation.isPending}
                      className={completed 
                        ? "bg-green-500/20 text-green-500 hover:bg-green-500/20" 
                        : "bg-primary hover:bg-primary/90"
                      }
                    >
                      {completed ? "Completed ✓" : completeTaskMutation.isPending ? "Processing..." : "Start Task"}
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
