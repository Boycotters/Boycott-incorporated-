import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TimerVerificationProps {
  taskId: string;
  durationSeconds?: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function TimerVerification({ 
  taskId, 
  durationSeconds = 30,
  onComplete, 
  onCancel 
}: TimerVerificationProps) {
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);

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
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Timer Verification</h3>
        <p className="text-sm text-muted-foreground">
          Complete the task and wait for the timer to finish
        </p>
      </div>

      <div className="bg-muted/50 rounded-xl p-6 text-center">
        {!started ? (
          <>
            <Clock className="w-12 h-12 mx-auto text-primary mb-3" />
            <p className="text-2xl font-bold mb-1">{formatTime(durationSeconds)}</p>
            <p className="text-sm text-muted-foreground">
              Timer will start when you click begin
            </p>
          </>
        ) : completed ? (
          <>
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-semibold text-green-500">Complete!</p>
            <p className="text-sm text-muted-foreground">
              You can now claim your reward
            </p>
          </>
        ) : (
          <>
            <div className="relative w-20 h-20 mx-auto mb-3">
              <Loader2 className="w-20 h-20 text-primary animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                {formatTime(remaining)}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we verify...
            </p>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={started && !completed}
        >
          Cancel
        </Button>
        {!started ? (
          <Button className="flex-1" onClick={handleStart}>
            <Clock className="h-4 w-4 mr-2" />
            Begin Task
          </Button>
        ) : (
          <Button 
            className="flex-1" 
            onClick={handleClaim}
            disabled={!completed}
          >
            {completed ? "Claim Reward" : "Waiting..."}
          </Button>
        )}
      </div>
    </div>
  );
}
