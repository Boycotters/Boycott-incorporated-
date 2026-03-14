import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, CheckCircle, ExternalLink, Play, Volume2, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

interface TimerVerificationProps {
  taskId: string;
  taskTitle?: string;
  taskDescription?: string;
  durationSeconds?: number;
  onComplete: () => void;
  onCancel: () => void;
}

// Stable content arrays - no random selection during render
const tutorialTopics = [
  { title: "Welcome to Pesa Rewards", content: "Learn how to maximize your earnings with daily tasks, streaks, and referrals. Complete tasks consistently to build your points." },
  { title: "Building Your Streak", content: "Log in every day to build your streak and unlock bonus multipliers. A 7-day streak earns you 50 bonus points!" },
  { title: "VIP Benefits Explained", content: "Higher VIP tiers give you better point multipliers and exclusive rewards. Silver tier starts at just 200 points." },
  { title: "Smart Earning Tips", content: "Complete high-value tasks first and check flash deals for bonus points. Games give you 4 attempts daily!" },
];

const tips = [
  "Complete tasks during flash deals for 2x points!",
  "Referring friends earns you 500 bonus points each.",
  "Daily login streaks unlock milestone bonuses at 7, 14, and 30 days.",
  "VIP Diamond members get 2x point multipliers on all tasks.",
  "Watch videos to the end - points are awarded for full views.",
  "Complete your profile to unlock bonus tasks.",
  "Check the Discover page for AI-personalized task recommendations.",
];

const articles = [
  {
    title: "Smart Money Management in Zambia",
    content: [
      "Track all your expenses using a simple notebook or app.",
      "Save at least 10% of any money you receive.",
      "Use mobile money for quick, secure transactions.",
      "Compare prices before making major purchases.",
      "Build an emergency fund for unexpected costs."
    ]
  },
  {
    title: "Growing Your Income",
    content: [
      "Look for side hustles that match your skills.",
      "Use apps like Pesa Rewards to earn extra income.",
      "Invest in learning new skills for better opportunities.",
      "Network with others to find new income sources.",
      "Consider small business ideas with low startup costs."
    ]
  },
  {
    title: "Mobile Money Security Tips",
    content: [
      "Never share your PIN with anyone, not even family.",
      "Always verify transaction details before confirming.",
      "Keep your registered SIM card secure at all times.",
      "Log out of mobile money apps after each use.",
      "Report any suspicious activity to your provider immediately."
    ]
  }
];

// Get stable content based on task ID (deterministic)
const getStableIndex = (id: string, arrayLength: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % arrayLength;
};

export function TimerVerification({ 
  taskId, 
  taskTitle,
  taskDescription,
  durationSeconds = 30,
  onComplete, 
  onCancel 
}: TimerVerificationProps) {
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Memoize content selection based on taskId - no random selection
  const taskContent = useMemo(() => {
    const title = taskTitle?.toLowerCase() || "";
    
    if (title.includes("video") || title.includes("watch") || title.includes("ad") || title.includes("tutorial")) {
      const topic = tutorialTopics[getStableIndex(taskId, tutorialTopics.length)];
      
      return {
        type: "video" as const,
        icon: Play,
        title: "Watch the Tutorial",
        description: "Watch the complete video to learn and earn your reward.",
        contentData: { topic },
      };
    }
    
    if (title.includes("tips") || title.includes("daily") || title.includes("guide") || title.includes("learn")) {
      const startIndex = getStableIndex(taskId, tips.length);
      const selectedTips = [
        tips[startIndex % tips.length],
        tips[(startIndex + 1) % tips.length],
        tips[(startIndex + 2) % tips.length],
        tips[(startIndex + 3) % tips.length],
      ];
      
      return {
        type: "article" as const,
        icon: BookOpen,
        title: "Read & Learn",
        description: "Read through these tips carefully to complete the task.",
        contentData: { tips: selectedTips },
      };
    }
    
    if (title.includes("article") || title.includes("read") || title.includes("blog") || title.includes("course") || title.includes("financial")) {
      const article = articles[getStableIndex(taskId, articles.length)];
      
      return {
        type: "reading" as const,
        icon: BookOpen,
        title: "Read the Article",
        description: "Read through the content below carefully to complete the task.",
        contentData: { article },
      };
    }
    
    if (title.includes("listen") || title.includes("audio") || title.includes("podcast")) {
      return {
        type: "audio" as const,
        icon: Volume2,
        title: "Listen to the Audio",
        description: "Listen to the complete audio clip to earn your points.",
        contentData: null,
      };
    }

    if (title.includes("browse") || title.includes("deal") || title.includes("shop") || title.includes("preview")) {
      return {
        type: "engage" as const,
        icon: ExternalLink,
        title: "Explore the Content",
        description: "Browse through and engage with the content to earn your reward.",
        contentData: null,
      };
    }
    
    // Default
    return {
      type: "default" as const,
      icon: ExternalLink,
      title: "Complete the Task",
      description: taskDescription || "Follow the instructions and engage with the content to earn your reward.",
      contentData: null,
    };
  }, [taskId, taskTitle, taskDescription]);

  const TaskIcon = taskContent.icon;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (started && !completed) {
      interval = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          if (next >= durationSeconds) {
            setCompleted(true);
            clearInterval(interval);
          }
          return next;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [started, completed, durationSeconds]);

  const handleStart = () => {
    setStarted(true);
    setElapsed(0);
  };

  const handleClaim = () => {
    onComplete();
  };

  const progress = (elapsed / durationSeconds) * 100;
  const remaining = durationSeconds - elapsed;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  // Render content based on type
  const renderContent = () => {
    switch (taskContent.type) {
      case "video":
        return (
          <div className="space-y-3">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center border border-border/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="text-center space-y-3 relative z-10">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto animate-pulse">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-sm text-white font-medium">{taskContent.contentData?.topic.title}</p>
              </div>
            </div>
            <Card className="p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">{taskContent.contentData?.topic.content}</p>
            </Card>
          </div>
        );
      
      case "article":
        return (
          <Card className="p-4 space-y-3 bg-gradient-to-br from-primary/5 to-transparent">
            <h4 className="font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Pro Tips for Earning More
            </h4>
            <div className="space-y-2">
              {(taskContent.contentData?.tips || []).map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </Card>
        );
      
      case "reading":
        return (
          <Card className="p-4 max-h-52 overflow-y-auto space-y-3 bg-muted/30">
            <h4 className="font-semibold">{taskContent.contentData?.article?.title}</h4>
            {(taskContent.contentData?.article?.content || []).map((point: string, i: number) => (
              <p key={i} className="text-sm text-muted-foreground">
                <strong>{i + 1}.</strong> {point}
              </p>
            ))}
          </Card>
        );
      
      case "audio":
        return (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Volume2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Audio Playing...</p>
                <div className="h-2 bg-primary/30 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Keep listening to complete</p>
              </div>
            </div>
          </div>
        );
      
      case "engage":
        return (
          <Card className="p-4 space-y-3 bg-gradient-to-br from-accent/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-sm">Exploring Content</p>
                <p className="text-xs text-muted-foreground">Take your time to browse</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['Featured Items', 'Special Offers', 'New Arrivals', 'Top Picks'].map((item, i) => (
                <div key={i} className="bg-background/50 rounded-lg p-2 text-center">
                  <div className="w-8 h-8 bg-muted rounded mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        );
      
      default:
        return (
          <Card className="p-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Task in Progress</p>
                <p className="text-xs text-muted-foreground">Complete the required action</p>
              </div>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 pl-4">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Follow the task instructions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Stay on this page until complete
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Claim your reward when done
              </li>
            </ul>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <TaskIcon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{taskContent.title}</h3>
        <p className="text-sm text-muted-foreground">
          {taskContent.description}
        </p>
      </div>

      {!started ? (
        /* Pre-start screen */
        <div className="bg-muted/50 rounded-xl p-6 text-center space-y-4">
          <Clock className="w-12 h-12 mx-auto text-primary" />
          <div>
            <p className="text-2xl font-bold">{formatTime(durationSeconds)}</p>
            <p className="text-sm text-muted-foreground">
              Estimated time to complete
            </p>
          </div>
          <p className="text-xs text-muted-foreground bg-background/50 rounded-lg p-2">
            💡 Stay on this page and engage with the content to earn your reward
          </p>
        </div>
      ) : completed ? (
        /* Completion screen */
        <div className="bg-green-500/10 rounded-xl p-6 text-center border border-green-500/20">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
          <p className="text-lg font-semibold text-green-500">Task Complete!</p>
          <p className="text-sm text-muted-foreground">
            You've successfully completed this task
          </p>
        </div>
      ) : (
        /* Active task content */
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{formatTime(remaining)} remaining</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Task content - now stable */}
          {renderContent()}

          {/* Timer indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Keep engaging with the content...</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={started && !completed}
        >
          {started && !completed ? "Please wait..." : "Cancel"}
        </Button>
        {!started ? (
          <Button className="flex-1" onClick={handleStart}>
            <TaskIcon className="h-4 w-4 mr-2" />
            Start Task
          </Button>
        ) : (
          <Button 
            className="flex-1" 
            onClick={handleClaim}
            disabled={!completed}
          >
            {completed ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Claim Reward
              </>
            ) : (
              "Completing..."
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
