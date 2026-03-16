import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Sparkles, Building2, Clock, CheckCircle, Loader2, ChevronRight, ChevronLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useAI } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import { useConfetti } from "@/hooks/useConfetti";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { WeekendBreakMessage } from "@/components/WeekendBreakMessage";
import { useDailyLimits } from "@/hooks/useDailyLimits";

interface GeneratedSurvey {
  title: string;
  description: string;
  estimatedMinutes: number;
  questions: Array<{
    id: string;
    question: string;
    type: "multiple_choice" | "text" | "scale";
    options?: string[];
    required: boolean;
  }>;
  points_reward: number;
  category: string;
}

interface SurveyTask {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
  category: string | null;
  verification_type: string | null;
  source: "ai" | "partner";
}

export default function Surveys() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { fireConfetti } = useConfetti();
  const queryClient = useQueryClient();
  const { generateSurvey, loading: aiLoading } = useAI();
  const { isWeekendBlocked, hasCampaign, canDoActivity, data: limitsData } = useDailyLimits();

  const [activeTab, setActiveTab] = useState<"available" | "active">("available");
  const [activeSurvey, setActiveSurvey] = useState<GeneratedSurvey | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [generatingSurveys, setGeneratingSurveys] = useState(false);
  const [aiSurveys, setAiSurveys] = useState<GeneratedSurvey[]>([]);

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ['user-data', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('level, vip_tier')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch survey tasks from database
  const { data: surveyTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['survey-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .in('category', ['survey', 'market_research', 'feedback', 'research'])
        .order('points_reward', { ascending: false });
      
      if (error) throw error;
      
      // Also get tasks with survey/ai_survey verification type
      const { data: surveyVerifTasks, error: err2 } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .in('verification_type', ['survey', 'ai_survey'])
        .order('points_reward', { ascending: false });
      
      if (err2) throw err2;

      // Merge and deduplicate
      const allTasks = [...(data || []), ...(surveyVerifTasks || [])];
      const uniqueMap = new Map(allTasks.map(t => [t.id, t]));
      
      return Array.from(uniqueMap.values()).map(task => ({
        ...task,
        source: (task.verification_type === 'ai_survey' ? 'ai' : 'partner') as "ai" | "partner"
      })) as SurveyTask[];
    },
  });

  // Fetch completed surveys
  const { data: completedSurveys } = useQuery({
    queryKey: ['completed-surveys', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('task_id')
        .eq('user_id', user?.id)
        .eq('status', 'completed');
      
      if (error) throw error;
      return data?.map(ut => ut.task_id) || [];
    },
    enabled: !!user?.id,
  });

  // Generate AI surveys on load
  useEffect(() => {
    if (userData && aiSurveys.length === 0 && !generatingSurveys) {
      generateAISurveys();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const generateAISurveys = async () => {
    setGeneratingSurveys(true);
    const categories = ['market_research', 'lifestyle', 'technology', 'entertainment'];
    const surveys: GeneratedSurvey[] = [];

    for (const category of categories) {
      const survey = await generateSurvey(
        category,
        userData?.level || 1,
        category,
        []
      );
      if (survey) {
        surveys.push({
          ...survey,
          category,
          points_reward: 15 + Math.floor(Math.random() * 20),
        });
      }
    }

    setAiSurveys(surveys);
    setGeneratingSurveys(false);
  };

  const handleStartSurvey = (survey: GeneratedSurvey) => {
    setActiveSurvey(survey);
    setCurrentQuestion(0);
    setAnswers({});
    setCompleted(false);
    setActiveTab("active");
  };

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (!activeSurvey) return;
    if (currentQuestion === activeSurvey.questions.length - 1) {
      handleSubmit();
    } else {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const completeSurveyMutation = useMutation({
    mutationFn: async ({ points, survey, surveyAnswers }: { 
      points: number; 
      survey: GeneratedSurvey; 
      surveyAnswers: Record<string, string>;
    }) => {
      // Format questions and responses for storage
      const formattedQuestions = survey.questions.map(q => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options || null,
        required: q.required
      }));
      
      const formattedResponses = survey.questions.map(q => ({
        question_id: q.id,
        question: q.question,
        answer: surveyAnswers[q.id] || ''
      }));

      // Use the secure server-side function to award survey points and store data
      const { data, error } = await supabase.rpc('award_survey_points', {
        p_user_id: user?.id,
        p_points: points,
        p_survey_title: survey.title,
        p_survey_id: `ai_${survey.category}_${Date.now()}`,
        p_questions: formattedQuestions,
        p_responses: formattedResponses,
        p_completion_time: survey.estimatedMinutes * 60
      });

      if (error) throw error;
      
      const result = data as { success: boolean; points_awarded: number; message: string };
      if (!result.success) {
        throw new Error(result.message);
      }

      return result.points_awarded;
    },
    onSuccess: (points) => {
      setSubmitting(false);
      fireConfetti();
      toast({
        title: "Survey Complete! 🎉",
        description: `You earned ${points} points!`,
      });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      queryClient.invalidateQueries({ queryKey: ['daily-activity-status'] });
    },
    onError: (error: any) => {
      setSubmitting(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!activeSurvey || submitting) return;
    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      completeSurveyMutation.mutate({ 
        points: activeSurvey.points_reward, 
        survey: activeSurvey,
        surveyAnswers: answers 
      }, {
        onSuccess: () => {
          setCompleted(true);
        }
      });
    } catch (error) {
      setSubmitting(false);
    }
  };

  const handleExitSurvey = () => {
    setActiveSurvey(null);
    setActiveTab("available");
    setCurrentQuestion(0);
    setAnswers({});
    setCompleted(false);
  };

  const question = activeSurvey?.questions[currentQuestion];
  const progress = activeSurvey ? ((currentQuestion + 1) / activeSurvey.questions.length) * 100 : 0;
  const canProceed = question ? (!question.required || answers[question.id]?.trim()) : false;
  const isLastQuestion = activeSurvey ? currentQuestion === activeSurvey.questions.length - 1 : false;

  // Render active survey
  if (activeTab === "active" && activeSurvey) {
    if (completed) {
      return (
        <div className="min-h-screen bg-background pb-24">
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleExitSurvey}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Survey Complete</h1>
            </div>
          </header>

          <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-500">Thank You!</h2>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Your responses have been recorded. You've earned {activeSurvey.points_reward} points!
              </p>
              <Button onClick={handleExitSurvey} className="mt-6">
                Back to Surveys
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleExitSurvey}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold line-clamp-1">{activeSurvey.title}</h1>
              <p className="text-xs text-muted-foreground">
                Question {currentQuestion + 1} of {activeSurvey.questions.length}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              {activeSurvey.points_reward} pts
            </Badge>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}% complete</p>
          </div>

          {/* Question Card */}
          {question && (
            <Card className="border-primary/20">
              <CardContent className="p-5 space-y-5">
                <p className="font-medium text-lg">
                  {question.question}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </p>

                {question.type === "multiple_choice" && question.options && (
                  <RadioGroup
                    value={answers[question.id] || ""}
                    onValueChange={(value) => handleAnswer(question.id, value)}
                    className="space-y-3"
                  >
                    {question.options.map((option, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                          answers[question.id] === option
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                        onClick={() => handleAnswer(question.id, option)}
                      >
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer font-normal">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.type === "scale" && (
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Button
                        key={num}
                        variant={answers[question.id] === String(num) ? "default" : "outline"}
                        className="flex-1 h-14 text-lg"
                        onClick={() => handleAnswer(question.id, String(num))}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                )}

                {question.type === "text" && (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={currentQuestion === 0 ? handleExitSurvey : handlePrevious}
              className="flex-1"
              disabled={submitting}
            >
              {currentQuestion === 0 ? (
                "Exit"
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </>
              )}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed || submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : isLastQuestion ? (
                "Submit"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show weekend break message if surveys are blocked
  if (isWeekendBlocked) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Surveys</h1>
            </div>
          </div>
        </header>
        <div className="p-4">
          <WeekendBreakMessage />
        </div>
      </div>
    );
  }

  // Render survey list
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Surveys</h1>
            <p className="text-xs text-muted-foreground">Earn points by sharing your opinions</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateAISurveys}
            disabled={generatingSurveys || aiLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", (generatingSurveys || aiLoading) && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Tabs for AI vs Partner surveys */}
        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Generated
            </TabsTrigger>
            <TabsTrigger value="partner" className="gap-2">
              <Building2 className="w-4 h-4" />
              Partner Surveys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4 mt-4">
            {generatingSurveys || aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating personalized surveys...</p>
              </div>
            ) : aiSurveys.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Sparkles className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    No AI surveys available. Click refresh to generate new ones.
                  </p>
                  <Button onClick={generateAISurveys}>Generate Surveys</Button>
                </CardContent>
              </Card>
            ) : (
              aiSurveys.map((survey, index) => (
                <Card key={index} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleStartSurvey(survey)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base line-clamp-2">{survey.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {survey.questions.length} questions • {survey.estimatedMinutes} min
                        </CardDescription>
                      </div>
                      <Badge className="bg-primary/10 text-primary shrink-0">
                        +{survey.points_reward} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Generated
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{survey.estimatedMinutes} min
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="partner" className="space-y-4 mt-4">
            {loadingTasks ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading partner surveys...</p>
              </div>
            ) : !surveyTasks || surveyTasks.filter(t => t.source === 'partner').length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Building2 className="w-12 h-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-muted-foreground">Partner surveys coming soon!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We're working with research organizations to bring you more opportunities.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              (surveyTasks || [])
                .filter(t => t.source === 'partner')
                .filter(t => !(completedSurveys || []).includes(t.id))
                .map((task) => (
                  <Card key={task.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {task.description}
                          </CardDescription>
                        </div>
                        <Badge className="bg-primary/10 text-primary shrink-0">
                          +{task.points_reward} pts
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Partner Survey
                        </div>
                        {task.category && (
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>

        {/* Info card */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">How Surveys Work</p>
                <p className="text-xs text-muted-foreground">
                  Complete AI-generated or partner surveys to earn points. AI surveys are personalized based on your profile and refresh regularly. Partner surveys come from research organizations and may offer higher rewards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
