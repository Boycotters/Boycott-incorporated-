import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Target, RefreshCw, Zap, Clock, Trophy, BookOpen, Video, Share2, Download, MessageSquare, Camera, HelpCircle, Brain, Globe, History, Lightbulb, Users, Timer } from "lucide-react";
import { useAI, RecommendationsResult, TaskRecommendation } from "@/hooks/useAI";
import { cn } from "@/lib/utils";
import { TimerVerification } from "@/components/task-verification/TimerVerification";
import { SurveyVerification } from "@/components/task-verification/SurveyVerification";
import { UrlVerification } from "@/components/task-verification/UrlVerification";
import { QuizVerification } from "@/components/task-verification/QuizVerification";
import { ScreenshotVerification } from "@/components/task-verification/ScreenshotVerification";
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
  easy: { color: "bg-primary/10 text-primary border-primary/20", icon: Zap, points: 20 },
  medium: { color: "bg-accent/10 text-accent-foreground border-accent/20", icon: Clock, points: 35 },
  hard: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: Trophy, points: 60 },
};

// Interest pools for variety
const INTEREST_POOLS = [
  ['trivia', 'learning'],
  ['photo', 'challenge'],
  ['survey', 'quiz'],
  ['social', 'lifestyle'],
  ['video_ad', 'quick'],
  ['trivia', 'quiz', 'learning'],
  ['photo', 'survey'],
  ['challenge', 'social'],
];

// Comprehensive task library with real, actionable content
const FALLBACK_TASKS: { taskType: string; category: string; reason: string; difficulty: 'easy' | 'medium' | 'hard'; icon?: any; verificationType: 'quiz' | 'survey' | 'timer' | 'url' | 'photo' }[] = [
  // TRIVIA TASKS - General Knowledge (Large Variety)
  { taskType: "World Geography Trivia", category: "trivia", reason: "Test your knowledge of countries, capitals, and landmarks", difficulty: "easy", icon: Globe, verificationType: "quiz" },
  { taskType: "African History Quiz", category: "trivia", reason: "Learn about important events in African history", difficulty: "medium", icon: History, verificationType: "quiz" },
  { taskType: "Science Facts Challenge", category: "trivia", reason: "Answer questions about physics, chemistry, and biology", difficulty: "medium", icon: Brain, verificationType: "quiz" },
  { taskType: "Sports Trivia Bowl", category: "trivia", reason: "Test your knowledge of football, basketball, and more", difficulty: "easy", icon: Trophy, verificationType: "quiz" },
  { taskType: "Music & Entertainment Quiz", category: "trivia", reason: "Identify songs, artists, and entertainment facts", difficulty: "easy", icon: Sparkles, verificationType: "quiz" },
  { taskType: "Zambian Culture Trivia", category: "trivia", reason: "How well do you know Zambian traditions and culture?", difficulty: "medium", icon: Globe, verificationType: "quiz" },
  { taskType: "Math & Logic Puzzle", category: "trivia", reason: "Solve quick math problems and logical puzzles", difficulty: "hard", icon: Brain, verificationType: "quiz" },
  { taskType: "Technology Trivia", category: "trivia", reason: "Test your knowledge of gadgets and tech innovations", difficulty: "medium", icon: Lightbulb, verificationType: "quiz" },
  { taskType: "Animal Kingdom Quiz", category: "trivia", reason: "Identify animals and their unique characteristics", difficulty: "easy", icon: Globe, verificationType: "quiz" },
  { taskType: "World Flags Challenge", category: "trivia", reason: "Can you identify flags from around the world?", difficulty: "medium", icon: Globe, verificationType: "quiz" },
  
  // TIMED QUIZ TASKS - Speed Challenges
  { taskType: "60-Second Speed Quiz", category: "quiz", reason: "Answer as many questions as you can in 60 seconds", difficulty: "medium", icon: Timer, verificationType: "quiz" },
  { taskType: "30-Second Lightning Round", category: "quiz", reason: "Quick-fire questions - think fast!", difficulty: "easy", icon: Zap, verificationType: "quiz" },
  { taskType: "90-Second Challenge", category: "quiz", reason: "Extended speed quiz with harder questions", difficulty: "hard", icon: Timer, verificationType: "quiz" },
  { taskType: "True or False Blitz", category: "quiz", reason: "Rapid true/false questions - how many can you get?", difficulty: "easy", icon: Zap, verificationType: "quiz" },
  { taskType: "Picture Quiz Rush", category: "quiz", reason: "Identify images quickly before time runs out", difficulty: "medium", icon: Camera, verificationType: "quiz" },
  
  // LEARNING TASKS - Educational Content
  { taskType: "Financial Literacy Lesson", category: "learning", reason: "Learn about saving, budgeting, and smart money habits", difficulty: "medium", icon: BookOpen, verificationType: "quiz" },
  { taskType: "Digital Safety Training", category: "learning", reason: "Learn to protect yourself online from scams", difficulty: "easy", icon: BookOpen, verificationType: "quiz" },
  { taskType: "Entrepreneurship Basics", category: "learning", reason: "Start your business journey with essential tips", difficulty: "medium", icon: Lightbulb, verificationType: "quiz" },
  { taskType: "Health & Wellness Tips", category: "learning", reason: "Learn about nutrition, exercise, and mental health", difficulty: "easy", icon: BookOpen, verificationType: "quiz" },
  { taskType: "Environmental Awareness", category: "learning", reason: "Understand climate change and sustainability", difficulty: "medium", icon: Globe, verificationType: "quiz" },
  { taskType: "Career Development Guide", category: "learning", reason: "Tips for job searching and career growth", difficulty: "medium", icon: BookOpen, verificationType: "quiz" },
  
  // PHOTO VERIFICATION TASKS
  { taskType: "Selfie Check-In", category: "photo", reason: "Take a selfie to verify your daily activity", difficulty: "easy", icon: Camera, verificationType: "photo" },
  { taskType: "Product Photo Review", category: "photo", reason: "Photograph a product you use and share feedback", difficulty: "medium", icon: Camera, verificationType: "photo" },
  { taskType: "Local Shop Photo", category: "photo", reason: "Visit and photograph a local business for exposure", difficulty: "medium", icon: Camera, verificationType: "photo" },
  { taskType: "Receipt Photo Verification", category: "photo", reason: "Submit a photo of a recent purchase receipt", difficulty: "easy", icon: Camera, verificationType: "photo" },
  { taskType: "Outdoor Activity Photo", category: "photo", reason: "Share a photo of you enjoying outdoor activities", difficulty: "easy", icon: Camera, verificationType: "photo" },
  { taskType: "Workspace Photo Share", category: "photo", reason: "Show us your work or study environment", difficulty: "easy", icon: Camera, verificationType: "photo" },
  { taskType: "Food & Drink Photo", category: "photo", reason: "Photograph your meal for food research", difficulty: "easy", icon: Camera, verificationType: "photo" },
  
  // SURVEY TASKS
  { taskType: "Quick Opinion Poll", category: "survey", reason: "Share your opinion on trending topics in 2 minutes", difficulty: "easy", icon: MessageSquare, verificationType: "survey" },
  { taskType: "Shopping Preferences Survey", category: "survey", reason: "Tell brands what products you prefer", difficulty: "easy", icon: MessageSquare, verificationType: "survey" },
  { taskType: "Media Consumption Survey", category: "survey", reason: "Share what TV, music, and content you enjoy", difficulty: "easy", icon: MessageSquare, verificationType: "survey" },
  { taskType: "Mobile Usage Survey", category: "survey", reason: "Help researchers understand phone habits", difficulty: "medium", icon: MessageSquare, verificationType: "survey" },
  { taskType: "Brand Awareness Survey", category: "survey", reason: "Share which brands you recognize and trust", difficulty: "easy", icon: MessageSquare, verificationType: "survey" },
  
  // SOCIAL TASKS
  { taskType: "Share App with Friends", category: "social", reason: "Invite 2 friends via WhatsApp and earn bonus when they sign up", difficulty: "easy", icon: Share2, verificationType: "url" },
  { taskType: "Follow Brand on Social", category: "social", reason: "Follow our partner brands on Facebook/Instagram", difficulty: "easy", icon: Share2, verificationType: "url" },
  { taskType: "Social Media Share", category: "social", reason: "Share a post about your earnings experience", difficulty: "medium", icon: Share2, verificationType: "url" },
  { taskType: "Community Invite", category: "social", reason: "Invite friends to join our earning community", difficulty: "medium", icon: Users, verificationType: "url" },
  
  // VIDEO TASKS
  { taskType: "Watch Partner Video", category: "video_ad", reason: "Watch a 30-second ad from our partner", difficulty: "easy", icon: Video, verificationType: "timer" },
  { taskType: "Educational Video", category: "video_ad", reason: "Learn about financial literacy while earning", difficulty: "easy", icon: Video, verificationType: "timer" },
  { taskType: "Product Showcase Video", category: "video_ad", reason: "Watch and learn about new products", difficulty: "easy", icon: Video, verificationType: "timer" },
  
  // CHALLENGE TASKS
  { taskType: "Daily Check-in Streak", category: "challenge", reason: "Maintain your login streak for bonus rewards", difficulty: "medium", icon: Trophy, verificationType: "timer" },
  { taskType: "Complete 5 Tasks Challenge", category: "challenge", reason: "Finish 5 tasks today for a completion bonus", difficulty: "hard", icon: Trophy, verificationType: "timer" },
  { taskType: "Referral Champion", category: "challenge", reason: "Get 3 friends to sign up this week", difficulty: "hard", icon: Trophy, verificationType: "url" },
  
  // QUICK TASKS
  { taskType: "Profile Completion", category: "quick", reason: "Complete your profile information", difficulty: "easy", icon: Zap, verificationType: "timer" },
  { taskType: "App Rating", category: "quick", reason: "Rate our app on the store for instant points", difficulty: "easy", icon: Zap, verificationType: "url" },
  { taskType: "Notification Enable", category: "quick", reason: "Turn on notifications for exclusive offers", difficulty: "easy", icon: Zap, verificationType: "timer" },
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
  const [selectedTask, setSelectedTask] = useState<(TaskRecommendation & { verificationType?: string }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const { recommendTasks, loading, error } = useAI();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fireConfetti } = useConfetti();
  const { canDoActivity, isWeekendBlocked, refetch: refetchLimits } = useDailyLimits();

  const loadRecommendations = async () => {
    // Add randomness to interests for variety
    const randomInterests = INTEREST_POOLS[Math.floor(Math.random() * INTEREST_POOLS.length)];
    const combinedInterests = [...new Set([...interests, ...randomInterests])];
    
    try {
      const result = await recommendTasks(userLevel, completedCategories, combinedInterests, vipTier);
      if (result && result.recommendations && result.recommendations.length > 0) {
        // Enrich with verification types from fallback library
        const enrichedRecommendations = result.recommendations.map((rec, idx) => {
          // Match to fallback to get verification type
          const matchedFallback = FALLBACK_TASKS.find(f => 
            f.category === rec.category || f.taskType.toLowerCase().includes(rec.taskType.toLowerCase().split(' ')[0])
          ) || FALLBACK_TASKS[(idx + Math.floor(Math.random() * FALLBACK_TASKS.length)) % FALLBACK_TASKS.length];
          
          // If AI returned empty or placeholder content, use fallback
          if (!rec.taskType || rec.taskType.length < 3 || !rec.reason || rec.reason.length < 10) {
            return {
              ...matchedFallback,
              pointsRange: `${difficultyConfig[matchedFallback.difficulty].points} pts`
            };
          }
          return {
            ...rec,
            verificationType: matchedFallback.verificationType,
          };
        });
        setRecommendations({
          ...result,
          recommendations: enrichedRecommendations,
        });
      } else {
        generateFallbackRecommendations();
      }
    } catch (err) {
      console.error('AI recommendations failed, using fallback:', err);
      generateFallbackRecommendations();
    }
  };

  const generateFallbackRecommendations = () => {
    // Shuffle and pick 6 random fallback tasks for more variety
    const shuffled = [...FALLBACK_TASKS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);
    
    const dailyFocusOptions = [
      "Try trivia quizzes for fun learning and quick points",
      "Complete photo tasks for instant verification rewards",
      "Take timed challenges to test your speed",
      "Focus on surveys for steady earnings today",
      "Mix easy and medium tasks for balanced progress",
      "Explore new task types to diversify your earnings",
    ];
    
    setRecommendations({
      recommendations: selected.map(t => ({
        ...t,
        pointsRange: `${difficultyConfig[t.difficulty].points} pts`
      })),
      dailyFocus: dailyFocusOptions[Math.floor(Math.random() * dailyFocusOptions.length)],
    });
  };

  useEffect(() => {
    loadRecommendations();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTaskClick = (rec: TaskRecommendation & { verificationType?: string }) => {
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

      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      queryClient.invalidateQueries({ queryKey: ['daily-activity-status'] });
      refetchLimits();
      
      setIsModalOpen(false);
      setSelectedTask(null);
      handleRefresh();
    } catch (err: any) {
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

  const getVerificationType = (task: TaskRecommendation & { verificationType?: string }): 'timer' | 'survey' | 'url' | 'quiz' | 'photo' => {
    if (task.verificationType) return task.verificationType as any;
    if (['trivia', 'quiz', 'learning'].includes(task.category)) return 'quiz';
    if (['survey'].includes(task.category)) return 'survey';
    if (['photo'].includes(task.category)) return 'photo';
    if (['social', 'app_install'].includes(task.category)) return 'url';
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

  const handlePhotoComplete = async (photoUrl: string) => {
    await handleComplete();
  };

  const renderVerification = () => {
    if (!selectedTask || !user?.id) return null;
    
    const verificationType = getVerificationType(selectedTask);
    
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
      case 'photo':
        return (
          <ScreenshotVerification
            taskId={`ai-${Date.now()}`}
            userId={user.id}
            onComplete={handlePhotoComplete}
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
                <CardTitle className="text-base">For You</CardTitle>
                <p className="text-xs text-muted-foreground">Personalized tasks</p>
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

          {/* Recommendations Grid */}
          <div className="grid gap-2">
            {recommendations.recommendations.slice(0, 6).map((rec, index) => {
              const DiffIcon = difficultyConfig[rec.difficulty].icon;
              const points = difficultyConfig[rec.difficulty].points;
              const TaskIcon = (rec as any).icon || HelpCircle;
              
              return (
                <div
                  key={index}
                  className="group p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(rec as any)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <TaskIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm truncate">{rec.taskType}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{rec.reason}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs capitalize", difficultyConfig[rec.difficulty].color)}
                      >
                        {rec.difficulty}
                      </Badge>
                      <span className="text-xs font-semibold text-primary">{points} pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Load More Tasks
          </Button>
        </CardContent>
      </Card>

      {/* Verification Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.taskType}</DialogTitle>
            <DialogDescription>{selectedTask?.reason}</DialogDescription>
          </DialogHeader>
          {renderVerification()}
        </DialogContent>
      </Dialog>
    </>
  );
}
