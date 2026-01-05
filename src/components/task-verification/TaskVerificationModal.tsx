import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScreenshotVerification } from "./ScreenshotVerification";
import { UrlVerification } from "./UrlVerification";
import { TimerVerification } from "./TimerVerification";
import { DataVerification } from "./DataVerification";
import { SurveyVerification } from "./SurveyVerification";
import { AISurveyVerification } from "./AISurveyVerification";
import { QuizVerification } from "./QuizVerification";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  verification_type: string;
  points_reward: number;
}

interface TaskVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  userId: string;
  userLevel?: number;
  onVerificationComplete: (taskId: string, proofUrl?: string) => void;
}

export function TaskVerificationModal({
  open,
  onOpenChange,
  task,
  userId,
  userLevel = 1,
  onVerificationComplete,
}: TaskVerificationModalProps) {
  if (!task) return null;

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleComplete = (proofUrl?: string) => {
    onVerificationComplete(task.id, proofUrl);
    onOpenChange(false);
  };

  // Check if this is a quiz task (has percentage requirement in title/description)
  const isQuizTask = task.title.toLowerCase().includes('quiz') || 
                     task.description?.toLowerCase().includes('score') ||
                     task.description?.toLowerCase().includes('%');

  const renderVerification = () => {
    switch (task.verification_type) {
      case 'screenshot':
        return (
          <ScreenshotVerification
            taskId={task.id}
            userId={userId}
            onComplete={(proofUrl) => handleComplete(proofUrl)}
            onCancel={handleCancel}
          />
        );
      case 'url':
        return (
          <UrlVerification
            taskId={task.id}
            taskTitle={task.title}
            taskDescription={task.description || undefined}
            onComplete={(proofUrl) => handleComplete(proofUrl)}
            onCancel={handleCancel}
          />
        );
      case 'timer':
        return (
          <TimerVerification
            taskId={task.id}
            taskTitle={task.title}
            taskDescription={task.description || undefined}
            durationSeconds={30}
            onComplete={() => handleComplete()}
            onCancel={handleCancel}
          />
        );
      case 'survey':
        return (
          <SurveyVerification
            taskId={task.id}
            taskTitle={task.title}
            onComplete={() => handleComplete()}
            onCancel={handleCancel}
          />
        );
      case 'ai_survey':
        // If it's a quiz task, use QuizVerification
        if (isQuizTask) {
          // Extract pass percentage from description if available
          const percentMatch = task.description?.match(/(\d+)%/);
          const passPercentage = percentMatch ? parseInt(percentMatch[1]) : 80;
          
          return (
            <QuizVerification
              taskId={task.id}
              taskTitle={task.title}
              taskCategory={task.category || undefined}
              userLevel={userLevel}
              passPercentage={passPercentage}
              onComplete={(passed, score) => {
                if (passed) {
                  handleComplete();
                } else {
                  handleCancel();
                }
              }}
              onCancel={handleCancel}
            />
          );
        }
        return (
          <AISurveyVerification
            taskId={task.id}
            taskTitle={task.title}
            taskCategory={task.category || undefined}
            userLevel={userLevel}
            onComplete={() => handleComplete()}
            onCancel={handleCancel}
          />
        );
      case 'instant':
        return (
          <DataVerification
            taskId={task.id}
            userId={userId}
            taskTitle={task.title}
            onComplete={() => handleComplete()}
            onCancel={handleCancel}
          />
        );
      default:
        handleComplete();
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">{task.title}</DialogTitle>
        </DialogHeader>
        {renderVerification()}
      </DialogContent>
    </Dialog>
  );
}
