import { useState, useEffect } from "react";
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

// Sample task content based on task type
const getTaskContent = (taskTitle?: string) => {
  const title = taskTitle?.toLowerCase() || "";
  
  if (title.includes("video") || title.includes("watch") || title.includes("ad")) {
    return {
      type: "video",
      icon: Play,
      title: "Watch the Video",
      description: "Watch the complete video to earn your reward. Make sure to watch until the end!",
      content: (
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-border/50">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Video content playing...</p>
          </div>
        </div>
      ),
    };
  }
  
  if (title.includes("article") || title.includes("read") || title.includes("blog")) {
    return {
      type: "article",
      icon: BookOpen,
      title: "Read the Article",
      description: "Read through the content below carefully to complete the task.",
      content: (
        <Card className="p-4 max-h-48 overflow-y-auto space-y-3 bg-muted/30">
          <h4 className="font-semibold">5 Tips for Better Productivity</h4>
          <p className="text-sm text-muted-foreground">
            1. <strong>Start with the hardest task</strong> - Tackle your most challenging work when your energy is highest.
          </p>
          <p className="text-sm text-muted-foreground">
            2. <strong>Take regular breaks</strong> - The Pomodoro Technique suggests 25 minutes of focus followed by 5-minute breaks.
          </p>
          <p className="text-sm text-muted-foreground">
            3. <strong>Eliminate distractions</strong> - Put your phone on silent and close unnecessary tabs.
          </p>
          <p className="text-sm text-muted-foreground">
            4. <strong>Set clear goals</strong> - Know exactly what you want to accomplish each day.
          </p>
          <p className="text-sm text-muted-foreground">
            5. <strong>Review your progress</strong> - End each day by reviewing what you accomplished.
          </p>
        </Card>
      ),
    };
  }
  
  if (title.includes("listen") || title.includes("audio") || title.includes("podcast")) {
    return {
      type: "audio",
      icon: Volume2,
      title: "Listen to the Audio",
      description: "Listen to the complete audio clip to earn your points.",
      content: (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Volume2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="h-2 bg-primary/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse" style={{ width: "60%" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Audio playing...</p>
            </div>
          </div>
        </div>
      ),
    };
  }
  
  // Default: app install / engagement task
  return {
    type: "engage",
    icon: ExternalLink,
    title: "Complete the Task",
    description: "Follow the instructions and engage with the content to earn your reward.",
    content: (
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
    ),
  };
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

  const taskContent = getTaskContent(taskTitle);
  const TaskIcon = taskContent.icon;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
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

          {/* Task content */}
          {taskContent.content}

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
