import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Target, RefreshCw, Zap, Clock, Trophy, CheckCircle, Coins, AlertCircle, BookOpen, Video, Share2, Download, MessageSquare } from "lucide-react";
import { useAI, RecommendationsResult, TaskRecommendation } from "@/hooks/useAI";
import { cn } from "@/lib/utils";
import { TimerVerification } from "@/components/task-verification/TimerVerification";
import { SurveyVerification } from "@/components/task-verification/SurveyVerification";
import { UrlVerification } from "@/components/task-verification/UrlVerification";
import { QuizVerification } from "@/components/task-verification/QuizVerification";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useConfetti } from "@/hooks/useConfetti";
import { useDailyLimits } from "@/hooks/useDailyLimits";

interface TaskRecommendationsProps {
  userLevel: number;
  completedCategories: string[];
  interests: string[];
  vipTier: string;
  onSelectCategory?: (category: string) => void;
}

const difficultyConfig = {
  easy: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: Zap, points: 25 },
  medium: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock, points: 50 },
  hard: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: Trophy, points: 100 },
};

// Interest pools for variety
const INTEREST_POOLS = [
  ['social', 'gaming'],
  ['lifestyle', 'shopping'],
  ['learning', 'challenge'],
  ['video_ad', 'survey'],
  ['quick', 'app_install'],
  ['social', 'lifestyle', 'gaming'],
  ['shopping', 'learning'],
  ['challenge', 'quick'],
];

// Comprehensive fallback task content with real, actionable tasks
const FALLBACK_TASKS: { taskType: string; category: string; reason: string; difficulty: 'easy' | 'medium' | 'hard'; icon?: any }[] = [
  // Social Tasks
  { taskType: "Share App with Friends", category: "social", reason: "Invite 2 friends via WhatsApp and earn bonus when they sign up", difficulty: "easy", icon: Share2 },
  { taskType: "Follow Brand on Social Media", category: "social", reason: "Follow our partner brands on Facebook/Instagram for instant rewards", difficulty: "easy", icon: Share2 },
  { taskType: "Share Your Success Story", category: "social", reason: "Post about your earnings on social media and tag us", difficulty: "medium", icon: Share2 },
  
  // Survey Tasks  
  { taskType: "Complete Quick Survey", category: "survey", reason: "Answer 5 questions about your shopping preferences", difficulty: "easy", icon: MessageSquare },
  { taskType: "Product Opinion Survey", category: "survey", reason: "Share your thoughts on new product ideas for market research", difficulty: "medium", icon: MessageSquare },
  { taskType: "Consumer Habits Survey", category: "survey", reason: "Help brands understand buying behaviors in Zambia", difficulty: "medium", icon: MessageSquare },
  
  // Video Tasks
  { taskType: "Watch Partner Video", category: "video_ad", reason: "Watch a 30-second ad from our partner and earn points", difficulty: "easy", icon: Video },
  { taskType: "Watch Educational Content", category: "video_ad", reason: "Learn about financial literacy while earning rewards", difficulty: "easy", icon: Video },
  
  // Learning/Quiz Tasks
  { taskType: "Knowledge Quiz Challenge", category: "learning", reason: "Test your general knowledge and earn points for correct answers", difficulty: "medium", icon: BookOpen },
  { taskType: "Market Research Quiz", category: "learning", reason: "Answer questions about current trends and consumer habits", difficulty: "hard", icon: BookOpen },
  { taskType: "Financial Literacy Quiz", category: "learning", reason: "Learn about saving, investing and money management", difficulty: "medium", icon: BookOpen },
  { taskType: "Local Knowledge Quiz", category: "learning", reason: "Test your knowledge about Zambia and earn rewards", difficulty: "easy", icon: BookOpen },
  
  // App Install Tasks
  { taskType: "App Install Challenge", category: "app_install", reason: "Download a partner app and complete the tutorial for points", difficulty: "medium", icon: Download },
  { taskType: "Try New App Feature", category: "app_install", reason: "Explore a new feature in a partner app and share feedback", difficulty: "easy", icon: Download },
  
  // Quick Tasks
  { taskType: "Daily Check-in Streak", category: "quick", reason: "Maintain your login streak for 7 days to unlock bonus rewards", difficulty: "medium", icon: Zap },
  { taskType: "Profile Completion", category: "quick", reason: "Complete your profile information for verification bonus", difficulty: "easy", icon: Zap },
  
  // Challenge Tasks
  { taskType: "Product Feedback Review", category: "challenge", reason: "Try a product and share your honest review with photos", difficulty: "medium", icon: Trophy },
  { taskType: "Local Business Review", category: "challenge", reason: "Visit a local store and leave a genuine review", difficulty: "hard", icon: Trophy },
  { taskType: "Referral Champion", category: "challenge", reason: "Get 5 friends to sign up and reach Silver VIP status", difficulty: "hard", icon: Trophy },
  
  // Lifestyle Tasks
  { taskType: "Brand Awareness Task", category: "lifestyle", reason: "Engage with a brand campaign and share your experience", difficulty: "medium" },
  { taskType: "Lifestyle Survey", category: "lifestyle", reason: "Share your daily habits and preferences for research", difficulty: "easy" },
  
  // Gaming Tasks
  { taskType: "Gaming Achievement", category: "gaming", reason: "Score 100+ points in a mini-game to unlock rewards", difficulty: "medium", icon: Trophy },
  { taskType: "High Score Challenge", category: "gaming", reason: "Beat your personal best in any game for bonus points", difficulty: "hard", icon: Trophy },
];

export function TaskRecommendations({
  userLevel,
  completedCategories,
  interests,
  vipTier,
  onSelectCategory
}: TaskRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendationsResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTask, setSelectedTask] = useState<TaskRecommendation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const { recommendTasks, loading, error } = useAI();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fireConfetti } = useConfetti();
  const { canDoActivity, isWeekendBlocked, data: dailyLimits, refetch: refetchLimits } = useDailyLimits();

  const loadRecommendations = async () => {
    // Add randomness to interests for variety
    const randomInterests = INTEREST_POOLS[Math.floor(Math.random() * INTEREST_POOLS.length)];
    const combinedInterests = [...new Set([...interests, ...randomInterests])];
    
    try {
      const result = await recommendTasks(userLevel, completedCategories, combinedInterests, vipTier);
      if (result && result.recommendations && result.recommendations.length > 0) {
        // Ensure all recommendations have proper content
        const enrichedRecommendations = result.recommendations.map((rec, idx) => {
          // If AI returned empty or placeholder content, use fallback
          if (!rec.taskType || rec.taskType.length < 3 || !rec.reason || rec.reason.length < 10) {
            const fallback = FALLBACK_TASKS[(idx + Math.floor(Math.random() * FALLBACK_TASKS.length)) % FALLBACK_TASKS.length];
            return {
              ...rec,
              taskType: fallback.taskType,
              reason: fallback.reason,
              category: fallback.category,
              difficulty: fallback.difficulty,
            };
          }
          return rec;
        });
        setRecommendations({
          ...result,
          recommendations: enrichedRecommendations,
        });
      } else {
        // Use fallback tasks if AI fails
        generateFallbackRecommendations();
      }
    } catch (err) {
      console.error('AI recommendations failed, using fallback:', err);
      generateFallbackRecommendations();
    }
  };

  const generateFallbackRecommendations = () => {
    // Shuffle and pick 4 random fallback tasks
    const shuffled = [...FALLBACK_TASKS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 4);
    
    const dailyFocusOptions = [
      "Complete quick tasks to build momentum today",
      "Focus on surveys for maximum earnings",
      "Try social tasks to boost your network",
      "Challenge yourself with harder tasks for bigger rewards",
      "Mix easy and medium tasks for steady progress",
    ];
    
    setRecommendations({
      recommendations: selected.map((t, i) => ({
        ...t,
        pointsRange: `${difficultyConfig[t.difficulty].points} pts`
      })),
      dailyFocus: dailyFocusOptions[Math.floor(Math.random() * dailyFocusOptions.length)],
    });
  };

  useEffect(() => {
    loadRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTaskClick = (rec: TaskRecommendation) => {
    // Check if user can do partnered tasks
    if (!canDoActivity('partnered_tasks')) {
      toast({
        title: "Daily Limit Reached",
        description: isWeekendBlocked ? "Tasks resume on Monday!" : "You've reached your daily task limit.",
        variant: "destructive"
      });
      return;
    }
    setSelectedTask(rec);
    setIsModalOpen(true);
  };

  const handleComplete = async () => {
    if (!user?.id || !selectedTask) return;
    
    const points = difficultyConfig[selectedTask.difficulty].points;
    setIsCompleting(true);
    
    try {
      // Use secure server-side RPC to complete AI task
      const { data: result, error } = await supabase.rpc('complete_ai_partner_task', {
        p_user_id: user.id,
        p_task_type: selectedTask.taskType,
        p_task_title: selectedTask.taskType,
        p_points_amount: points,
        p_source: 'ai'
      });

      if (error) throw error;
      
      const typedResult = result as { success: boolean; message: string; points_awarded?: number };
      
      if (!typedResult.success) {
        throw new Error(typedResult.message);
      }

      fireConfetti();
      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${typedResult.points_awarded || points} points!`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      queryClient.invalidateQueries({ queryKey: ['daily-activity-status'] });
      refetchLimits();
      
      setIsModalOpen(false);
      setSelectedTask(null);
      
      // Refresh recommendations
      handleRefresh();
    } catch (err: any) {
      console.error('Error completing task:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to complete task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const getVerificationType = (category: string): 'timer' | 'survey' | 'url' | 'quiz' => {
    if (['learning', 'challenge'].includes(category)) return 'quiz';
    if (['survey'].includes(category)) return 'survey';
    if (['social', 'app_install'].includes(category)) return 'url';
    return 'timer';
  };

  const handleQuizComplete = async (passed: boolean, score: number) => {
    if (!passed) {
      toast({
        title: "Quiz Not Passed",
        description: "You need to score higher to earn points. Try again!",
        variant: "destructive"
      });
      setIsModalOpen(false);
      setSelectedTask(null);
      return;
    }
    await handleComplete();
  };

  const renderVerification = () => {
    if (!selectedTask || !user?.id) return null;
    
    const verificationType = getVerificationType(selectedTask.category);
    const points = difficultyConfig[selectedTask.difficulty].points;
    
    switch (verificationType) {
      case 'quiz':
        return (
          <QuizVerification
            taskId={`ai-${Date.now()}`}
            taskTitle={selectedTask.taskType}
            taskCategory={selectedTask.category}
            userLevel={80}
            passPercentage={60}
            onComplete={handleQuizComplete}
            onCancel={handleCancel}
          />
        );
      case 'survey':
        return (
          <SurveyVerification
            taskId={`ai-${Date.now()}`}
            taskTitle={selectedTask.taskType}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        );
      case 'url':
        return (
          <UrlVerification
            taskId={`ai-${Date.now()}`}
            taskTitle={selectedTask.taskType}
            taskDescription={selectedTask.reason}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        );
      default:
        return (
          <TimerVerification
            taskId={`ai-${Date.now()}`}
            taskTitle={selectedTask.taskType}
            taskDescription={selectedTask.reason}
            durationSeconds={selectedTask.difficulty === 'easy' ? 30 : selectedTask.difficulty === 'medium' ? 60 : 90}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        );
    }
  };

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
    <>
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
              onClick={handleRefresh}
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
              const points = difficultyConfig[rec.difficulty].points;
              
              return (
                <div
                  key={index}
                  className="group p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(rec)}
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
                      <Coins className="w-3 h-3 mr-1" />
                      {points} pts
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Task Completion Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{selectedTask?.taskType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{selectedTask?.reason}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                {selectedTask && (
                  <>
                    <Badge className={difficultyConfig[selectedTask.difficulty].color}>
                      {selectedTask.difficulty}
                    </Badge>
                    <Badge variant="secondary">
                      <Coins className="w-3 h-3 mr-1" />
                      {difficultyConfig[selectedTask.difficulty].points} pts
                    </Badge>
                  </>
                )}
              </div>
            </div>
            {renderVerification()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
