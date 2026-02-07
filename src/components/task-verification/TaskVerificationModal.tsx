import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface QuizData {
  question: string;
  options: string[];
  correct_answer: number;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  verification_type: string;
  points_reward: number;
  quiz_data?: QuizData[] | null;
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

  // Check if this is a quiz task
  const isQuizTask = task.verification_type === 'quiz' ||
                     task.title.toLowerCase().includes('quiz') || 
                     task.description?.toLowerCase().includes('score') ||
                     task.description?.toLowerCase().includes('%') ||
                     (task.quiz_data && task.quiz_data.length > 0);

  // Extract pass percentage from description if available
  const getPassPercentage = () => {
    const percentMatch = task.description?.match(/(\d+)%/);
    return percentMatch ? parseInt(percentMatch[1]) : 60;
  };

  const renderVerification = () => {
    // If task has custom quiz_data or is a quiz type, use QuizVerification
    if (task.verification_type === 'quiz' || (task.quiz_data && task.quiz_data.length > 0)) {
      return (
        <QuizVerification
          taskId={task.id}
          taskTitle={task.title}
          taskCategory={task.category || undefined}
          userLevel={userLevel}
          passPercentage={getPassPercentage()}
          customQuizData={task.quiz_data || undefined}
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
          return (
            <QuizVerification
              taskId={task.id}
              taskTitle={task.title}
              taskCategory={task.category || undefined}
              userLevel={userLevel}
              passPercentage={getPassPercentage()}
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
      case 'data':
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
          <DialogDescription className="sr-only">Complete the task verification</DialogDescription>
        </DialogHeader>
        {renderVerification()}
      </DialogContent>
    </Dialog>
  );
}