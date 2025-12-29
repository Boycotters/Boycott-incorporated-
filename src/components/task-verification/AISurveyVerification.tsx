import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { CheckCircle, ChevronLeft, ChevronRight, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAI, GeneratedSurvey, SurveyQuestion } from "@/hooks/useAI";
import { Card } from "@/components/ui/card";

interface AISurveyVerificationProps {
  taskId: string;
  taskTitle?: string;
  taskCategory?: string;
  userLevel?: number;
  onComplete: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

export function AISurveyVerification({
  taskId,
  taskTitle,
  taskCategory = "general",
  userLevel = 1,
  onComplete,
  onCancel,
}: AISurveyVerificationProps) {
  const [survey, setSurvey] = useState<GeneratedSurvey | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { generateSurvey, loading: aiLoading, error: aiError } = useAI();

  // Generate survey on mount
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const result = await generateSurvey(
          taskTitle || "general",
          userLevel,
          taskCategory
        );
        
        if (result) {
          setSurvey(result);
        } else {
          setGenerationError("Failed to generate survey. Using default questions.");
          // Fallback to default survey
          setSurvey({
            title: "Quick Survey",
            description: "Share your thoughts with us",
            estimatedMinutes: 2,
            questions: [
              {
                id: "q1",
                question: "How would you rate your experience?",
                type: "scale",
                required: true
              },
              {
                id: "q2",
                question: "What do you enjoy most about earning rewards?",
                type: "multiple_choice",
                options: ["Completing tasks", "Building streaks", "Redeeming rewards", "Competing with others"],
                required: true
              },
              {
                id: "q3",
                question: "Any suggestions for improvement?",
                type: "text",
                required: false
              }
            ]
          });
        }
      } catch (err) {
        setGenerationError("Failed to generate survey");
      }
    };

    loadSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (aiLoading || !survey) {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold">Generating Your Survey...</h3>
          <p className="text-sm text-muted-foreground">
            AI is creating personalized questions just for you
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  const questions = survey.questions;
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const canProceed = !question.required || answers[question.id]?.trim();
  const isLastQuestion = currentQuestion === questions.length - 1;

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: value }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
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

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCompleted(true);
    setTimeout(() => {
      onComplete(answers);
    }, 1500);
  };

  if (completed) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-green-500">Survey Complete!</h3>
          <p className="text-sm text-muted-foreground">
            Thank you for your responses. Your answers help us improve!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{survey.title}</h3>
        <p className="text-sm text-muted-foreground">{survey.description}</p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>~{survey.estimatedMinutes} min</span>
          <span>•</span>
          <span className="text-primary">AI-Powered</span>
        </div>
      </div>

      {generationError && (
        <Card className="p-3 bg-yellow-500/10 border-yellow-500/20">
          <div className="flex items-center gap-2 text-sm text-yellow-600">
            <AlertCircle className="w-4 h-4" />
            <span>Using default questions</span>
          </div>
        </Card>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-4">
        <p className="font-medium">
          {question.question}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </p>

        {question.type === "multiple_choice" && question.options && (
          <RadioGroup
            value={answers[question.id] || ""}
            onValueChange={handleAnswer}
            className="space-y-2"
          >
            {question.options.map((option, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                  answers[question.id] === option
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => handleAnswer(option)}
              >
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === "scale" && (
          <div className="space-y-4">
            <Slider
              value={[parseInt(answers[question.id] || "5")]}
              onValueChange={([val]) => handleAnswer(val.toString())}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 - Poor</span>
              <span className="font-medium text-primary text-lg">{answers[question.id] || "5"}</span>
              <span>10 - Excellent</span>
            </div>
          </div>
        )}

        {question.type === "text" && (
          <Textarea
            placeholder="Type your answer here..."
            value={answers[question.id] || ""}
            onChange={(e) => handleAnswer(e.target.value)}
            rows={4}
            className="resize-none"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={currentQuestion === 0 ? onCancel : handlePrevious}
          className="flex-1"
          disabled={submitting}
        >
          {currentQuestion === 0 ? (
            "Cancel"
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
            "Submit Survey"
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
