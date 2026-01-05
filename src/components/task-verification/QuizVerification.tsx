import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, XCircle, ChevronRight, Sparkles, Loader2, 
  AlertCircle, Trophy, Brain, Timer 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAI } from "@/hooks/useAI";
import { Card } from "@/components/ui/card";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  passPercentage: number;
  timePerQuestion: number;
  questions: QuizQuestion[];
}

interface QuizVerificationProps {
  taskId: string;
  taskTitle?: string;
  taskCategory?: string;
  userLevel?: number;
  passPercentage?: number;
  onComplete: (passed: boolean, score: number) => void;
  onCancel: () => void;
}

export function QuizVerification({
  taskId,
  taskTitle = "Knowledge Quiz",
  taskCategory = "general",
  userLevel = 1,
  passPercentage = 80,
  onComplete,
  onCancel,
}: QuizVerificationProps) {
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const { loading: aiLoading, error: aiError } = useAI();

  // Generate quiz on mount
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        // Call AI service to generate quiz
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-service`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              action: 'generate_quiz',
              data: {
                topic: taskTitle,
                category: taskCategory,
                difficulty: userLevel <= 3 ? 'easy' : userLevel <= 7 ? 'medium' : 'hard',
                questionCount: 5,
                passPercentage,
              }
            })
          }
        );

        const result = await response.json();
        
        if (result.success && result.data) {
          setQuiz(result.data);
          setTimeLeft(result.data.timePerQuestion || 30);
        } else {
          // Fallback quiz
          setQuiz(generateFallbackQuiz(taskTitle, taskCategory));
        }
      } catch (err) {
        console.error('Quiz generation error:', err);
        setQuiz(generateFallbackQuiz(taskTitle, taskCategory));
      } finally {
        setIsLoading(false);
      }
    };

    loadQuiz();
  }, [taskTitle, taskCategory, userLevel, passPercentage]);

  // Timer countdown
  useEffect(() => {
    if (!quiz || quizCompleted || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up, move to next question
          handleNext();
          return quiz.timePerQuestion || 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, currentQuestion, quizCompleted, showResult]);

  const generateFallbackQuiz = (title: string, category: string): GeneratedQuiz => {
    const quizzes: Record<string, QuizQuestion[]> = {
      learning: [
        {
          id: "q1",
          question: "What is the best way to maximize your daily earnings?",
          options: ["Complete one task", "Build a streak", "Ignore bonuses", "Skip surveys"],
          correctAnswer: 1,
          explanation: "Maintaining a streak gives you bonus multipliers!"
        },
        {
          id: "q2",
          question: "How many consecutive days makes a '7-day streak' milestone?",
          options: ["5 days", "7 days", "10 days", "14 days"],
          correctAnswer: 1,
          explanation: "7 days of consecutive activity earns you milestone bonus!"
        },
        {
          id: "q3",
          question: "Which VIP tier offers the highest point multiplier?",
          options: ["Bronze", "Silver", "Gold", "Diamond"],
          correctAnswer: 3,
          explanation: "Diamond tier members get the best multipliers and perks!"
        },
        {
          id: "q4",
          question: "What happens when you refer a friend successfully?",
          options: ["Nothing", "You both earn bonus points", "Only they earn", "Points are deducted"],
          correctAnswer: 1,
          explanation: "Both referrer and referred friend earn bonus points!"
        },
        {
          id: "q5",
          question: "What's the minimum points needed to withdraw?",
          options: ["100 points", "500 points", "1000 points", "5000 points"],
          correctAnswer: 2,
          explanation: "You need at least 1000 points to make a withdrawal."
        }
      ],
      general: [
        {
          id: "q1",
          question: "What is the capital city of Zambia?",
          options: ["Johannesburg", "Lusaka", "Nairobi", "Harare"],
          correctAnswer: 1,
          explanation: "Lusaka is the capital and largest city of Zambia."
        },
        {
          id: "q2",
          question: "Which mobile money service is popular in Zambia?",
          options: ["PayPal", "Airtel Money", "Venmo", "Zelle"],
          correctAnswer: 1,
          explanation: "Airtel Money is widely used for mobile payments in Zambia."
        },
        {
          id: "q3",
          question: "What currency is used in Zambia?",
          options: ["Dollar", "Rand", "Kwacha", "Shilling"],
          correctAnswer: 2,
          explanation: "The Zambian Kwacha (ZMW) is the official currency."
        },
        {
          id: "q4",
          question: "Victoria Falls is located on the border of Zambia and which country?",
          options: ["Botswana", "Zimbabwe", "Malawi", "Tanzania"],
          correctAnswer: 1,
          explanation: "Victoria Falls borders Zambia and Zimbabwe."
        },
        {
          id: "q5",
          question: "What is the main language spoken in Zambia?",
          options: ["French", "Portuguese", "English", "Swahili"],
          correctAnswer: 2,
          explanation: "English is the official language of Zambia."
        }
      ]
    };

    const questions = quizzes[category] || quizzes.general;
    
    return {
      title: title || "Quick Knowledge Quiz",
      description: `Test your knowledge! Score ${passPercentage}% or higher to pass.`,
      passPercentage,
      timePerQuestion: 30,
      questions: questions.sort(() => Math.random() - 0.5)
    };
  };

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (!quiz) return;

    // Save answer
    if (selectedAnswer !== null) {
      setAnswers(prev => ({ ...prev, [currentQuestion]: selectedAnswer }));
    }

    // Show result for this question briefly
    setShowResult(true);
    
    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setTimeLeft(quiz.timePerQuestion || 30);
      } else {
        // Calculate final score
        calculateAndFinish();
      }
    }, 1500);
  };

  const calculateAndFinish = () => {
    if (!quiz) return;

    let correct = 0;
    quiz.questions.forEach((q, index) => {
      const userAnswer = index === currentQuestion ? selectedAnswer : answers[index];
      if (userAnswer === q.correctAnswer) {
        correct++;
      }
    });

    const percentage = Math.round((correct / quiz.questions.length) * 100);
    setScore(percentage);
    setQuizCompleted(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold">Generating Your Quiz...</h3>
          <p className="text-sm text-muted-foreground">
            AI is creating questions just for you
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load quiz</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Show final results
  if (quizCompleted) {
    const passed = score >= quiz.passPercentage;
    
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-4">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
            passed ? "bg-green-500/10" : "bg-destructive/10"
          )}>
            {passed ? (
              <Trophy className="w-10 h-10 text-green-500" />
            ) : (
              <XCircle className="w-10 h-10 text-destructive" />
            )}
          </div>
          
          <div>
            <h3 className={cn(
              "text-2xl font-bold",
              passed ? "text-green-500" : "text-destructive"
            )}>
              {passed ? "Congratulations!" : "Keep Trying!"}
            </h3>
            <p className="text-muted-foreground mt-1">
              You scored {score}%
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Your Score</span>
              <span className="font-bold">{score}%</span>
            </div>
            <Progress value={score} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Pass: {quiz.passPercentage}%</span>
              <span className={passed ? "text-green-500" : "text-destructive"}>
                {passed ? "PASSED" : "FAILED"}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {passed 
              ? "Great job! You've demonstrated your knowledge and earned points!" 
              : `You need ${quiz.passPercentage}% to pass. Try again later!`}
          </p>
        </div>

        <Button 
          className="w-full" 
          onClick={() => onComplete(passed, score)}
        >
          {passed ? "Claim Points" : "Close"}
        </Button>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{quiz.title}</h3>
        <p className="text-sm text-muted-foreground">
          Pass with {quiz.passPercentage}% or higher
        </p>
      </div>

      {/* Timer & Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
            timeLeft <= 10 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}>
            <Timer className="w-4 h-4" />
            {timeLeft}s
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <Card className="p-4 bg-muted/30">
        <p className="font-medium text-center mb-4">{question.question}</p>

        <RadioGroup
          value={selectedAnswer?.toString() || ""}
          className="space-y-2"
        >
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === question.correctAnswer;
            
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                  showResult && isCorrectOption && "border-green-500 bg-green-500/10",
                  showResult && isSelected && !isCorrectOption && "border-destructive bg-destructive/10",
                  !showResult && isSelected && "border-primary bg-primary/5",
                  !showResult && !isSelected && "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => !showResult && handleAnswerSelect(index)}
              >
                <RadioGroupItem 
                  value={index.toString()} 
                  id={`opt-${index}`}
                  checked={isSelected}
                  disabled={showResult}
                />
                <Label 
                  htmlFor={`opt-${index}`} 
                  className="flex-1 cursor-pointer flex items-center justify-between"
                >
                  <span>{option}</span>
                  {showResult && isCorrectOption && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {showResult && question.explanation && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Explanation: </span>
              {question.explanation}
            </p>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={showResult}
        >
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          disabled={selectedAnswer === null || showResult}
          className="flex-1"
        >
          {currentQuestion === quiz.questions.length - 1 ? "Finish" : "Next"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}