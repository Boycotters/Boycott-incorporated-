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

interface Task {
  id: string;
  title: string;
  description?: string | null;
  verification_type: string;
  points_reward: number;
}

interface TaskVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  userId: string;
  onVerificationComplete: (taskId: string, proofUrl?: string) => void;
}

export function TaskVerificationModal({
  open,
  onOpenChange,
  task,
  userId,
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
