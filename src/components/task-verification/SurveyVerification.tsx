import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SurveyVerificationProps {
  taskId: string;
  taskTitle?: string;
  onComplete: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

interface SurveyQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "text";
  options?: string[];
  required: boolean;
}

// Generate survey questions based on task title
const getSurveyQuestions = (taskTitle?: string): SurveyQuestion[] => {
  const title = taskTitle?.toLowerCase() || "";
  
  if (title.includes("feedback") || title.includes("review")) {
    return [
      {
        id: "q1",
        question: "How would you rate your overall experience with our app?",
        type: "multiple_choice",
        options: ["Excellent", "Good", "Average", "Below Average", "Poor"],
        required: true,
      },
      {
        id: "q2",
        question: "What feature do you use the most?",
        type: "multiple_choice",
        options: ["Earning Tasks", "Daily Streaks", "Achievements", "Wallet & Withdrawals", "Referrals"],
        required: true,
      },
      {
        id: "q3",
        question: "How likely are you to recommend this app to a friend?",
        type: "multiple_choice",
        options: ["Very Likely", "Likely", "Neutral", "Unlikely", "Very Unlikely"],
        required: true,
      },
      {
        id: "q4",
        question: "What improvements would you like to see?",
        type: "text",
        required: false,
      },
    ];
  }
  
  if (title.includes("product") || title.includes("market")) {
    return [
      {
        id: "q1",
        question: "Which category of products do you shop for most often online?",
        type: "multiple_choice",
        options: ["Electronics", "Fashion & Apparel", "Home & Garden", "Food & Groceries", "Entertainment"],
        required: true,
      },
      {
        id: "q2",
        question: "How often do you shop online?",
        type: "multiple_choice",
        options: ["Daily", "Weekly", "Monthly", "A few times a year", "Rarely"],
        required: true,
      },
      {
        id: "q3",
        question: "What influences your purchase decisions the most?",
        type: "multiple_choice",
        options: ["Price", "Brand Reputation", "Reviews", "Recommendations", "Advertisements"],
        required: true,
      },
    ];
  }
  
  // Default general survey
  return [
    {
      id: "q1",
      question: "How did you hear about this app?",
      type: "multiple_choice",
      options: ["Social Media", "Friend/Family", "Online Advertisement", "App Store", "Other"],
      required: true,
    },
    {
      id: "q2",
      question: "What is your primary goal for using this app?",
      type: "multiple_choice",
      options: ["Earn Extra Income", "Pass Time", "Complete Challenges", "Get Rewards", "All of the Above"],
      required: true,
    },
    {
      id: "q3",
      question: "How often do you complete tasks on this app?",
      type: "multiple_choice",
      options: ["Multiple times a day", "Once a day", "A few times a week", "Once a week", "Occasionally"],
      required: true,
    },
    {
      id: "q4",
      question: "Any additional feedback or suggestions?",
      type: "text",
      required: false,
    },
  ];
};

export function SurveyVerification({
  taskId,
  taskTitle,
  onComplete,
  onCancel,
}: SurveyVerificationProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const questions = getSurveyQuestions(taskTitle);
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];
  
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
    // Simulate submission delay
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
            Thank you for your feedback. Your responses have been recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Complete the Survey</h3>
        <p className="text-sm text-muted-foreground">
          Answer all questions to earn your reward
        </p>
      </div>

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
