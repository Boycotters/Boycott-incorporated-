import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Handshake, Sparkles, ExternalLink, Clock, Coins, RefreshCw, CheckCircle, Camera, FileText, AlertCircle } from "lucide-react";
import { useAI, PartnershipTask } from "@/hooks/useAI";
import { cn } from "@/lib/utils";
import { UrlVerification } from "@/components/task-verification/UrlVerification";
import { ScreenshotVerification } from "@/components/task-verification/ScreenshotVerification";
import { SurveyVerification } from "@/components/task-verification/SurveyVerification";
import { TimerVerification } from "@/components/task-verification/TimerVerification";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useConfetti } from "@/hooks/useConfetti";
import { useDailyLimits } from "@/hooks/useDailyLimits";

interface PartnershipCardProps {
  brandCategory?: string;
  targetAudience?: string;
  campaignType?: string;
  onStartTask?: (task: PartnershipTask) => void;
}

const verificationIcons = {
  url: ExternalLink,
  screenshot: Camera,
  survey: FileText,
  timer: Clock,
};

// Variety arrays for AI prompts
const BRAND_CATEGORIES = [
  "technology", "lifestyle", "fashion", "food", "entertainment", 
  "health", "finance", "travel", "gaming", "education", "sports"
];

const TARGET_AUDIENCES = [
  "gen-z", "millennials", "young professionals", "students", 
  "families", "tech enthusiasts", "fitness lovers", "gamers"
];

const CAMPAIGN_TYPES = [
  "brand_awareness", "engagement", "product_launch", "social_proof",
  "user_acquisition", "content_creation", "community_building"
];

export function PartnershipCard({
  brandCategory,
  targetAudience,
  campaignType,
  onStartTask
}: PartnershipCardProps) {
  const [partnership, setPartnership] = useState<PartnershipTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { generatePartnership, loading, error } = useAI();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fireConfetti } = useConfetti();
  const { canDoActivity, isWeekendBlocked, refetch: refetchLimits } = useDailyLimits();

  const loadPartnership = async () => {
    // Add randomness for variety on each refresh
    const randomBrand = brandCategory || BRAND_CATEGORIES[Math.floor(Math.random() * BRAND_CATEGORIES.length)];
    const randomAudience = targetAudience || TARGET_AUDIENCES[Math.floor(Math.random() * TARGET_AUDIENCES.length)];
    const randomCampaign = campaignType || CAMPAIGN_TYPES[Math.floor(Math.random() * CAMPAIGN_TYPES.length)];
    
    const result = await generatePartnership(randomBrand, randomAudience, randomCampaign);
    if (result) {
      setPartnership(result);
    }
  };

  useEffect(() => {
    loadPartnership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTask = () => {
    // Check if user can do partnered tasks
    if (!canDoActivity('partnered_tasks')) {
      toast({
        title: "Daily Limit Reached",
        description: isWeekendBlocked ? "Tasks resume on Monday!" : "You've reached your daily partner task limit.",
        variant: "destructive"
      });
      return;
    }
    if (partnership) {
      setIsModalOpen(true);
    }
  };

  const handleComplete = async (proofUrl?: string) => {
    if (!user?.id || !partnership) return;
    
    setIsCompleting(true);
    try {
      // Use secure server-side RPC to complete partner task
      const { data: result, error } = await supabase.rpc('complete_ai_partner_task', {
        p_user_id: user.id,
        p_task_type: 'partner_task',
        p_task_title: partnership.title,
        p_points_amount: partnership.suggestedPoints,
        p_source: 'partner'
      });

      if (error) throw error;
      
      const typedResult = result as { success: boolean; message: string; points_awarded?: number };
      
      if (!typedResult.success) {
        throw new Error(typedResult.message);
      }

      fireConfetti();
      toast({
        title: "Partner Task Completed! 🎉",
        description: `You earned ${typedResult.points_awarded || partnership.suggestedPoints} points!`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      queryClient.invalidateQueries({ queryKey: ['daily-activity-status'] });
      refetchLimits();
      
      setIsModalOpen(false);
      
      // Load new partnership after completion
      loadPartnership();
    } catch (err: any) {
      console.error('Error completing partner task:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to complete task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const renderVerification = () => {
    if (!partnership || !user?.id) return null;
    
    switch (partnership.verificationMethod) {
      case 'url':
        return (
          <UrlVerification
            taskId={`partner-${Date.now()}`}
            taskTitle={partnership.title}
            taskDescription={partnership.description}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        );
      case 'screenshot':
        return (
          <ScreenshotVerification
            taskId={`partner-${Date.now()}`}
            userId={user.id}
            onComplete={(proofUrl) => handleComplete(proofUrl)}
            onCancel={handleCancel}
          />
        );
      case 'survey':
        return (
          <SurveyVerification
            taskId={`partner-${Date.now()}`}
            taskTitle={partnership.title}
            onComplete={() => handleComplete()}
            onCancel={handleCancel}
          />
        );
      case 'timer':
        return (
          <TimerVerification
            taskId={`partner-${Date.now()}`}
            taskTitle={partnership.title}
            taskDescription={partnership.description}
            durationSeconds={60}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        );
      default:
        return (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">Complete the task requirements above</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={() => handleComplete()}>Mark Complete</Button>
            </div>
          </div>
        );
    }
  };

  if (loading && !partnership) {
    return (
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-amber-500 animate-pulse" />
            <CardTitle className="text-base">Partner Opportunity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !partnership) {
    return (
      <Card className="border-amber-500/20">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Unable to load partnership opportunity
          </p>
          <Button variant="outline" size="sm" onClick={loadPartnership}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const VerificationIcon = verificationIcons[partnership.verificationMethod];

  return (
    <>
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Handshake className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Partner Task</CardTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-Generated Opportunity
                </p>
              </div>
            </div>
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              <Coins className="w-3 h-3 mr-1" />
              {partnership.suggestedPoints} pts
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Task Info */}
          <div>
            <h4 className="font-semibold mb-1">{partnership.title}</h4>
            <p className="text-sm text-muted-foreground">{partnership.description}</p>
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
            <ul className="space-y-1">
              {(partnership.requirements || []).slice(0, 3).map((req, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {partnership.estimatedTime}
            </div>
            <div className="flex items-center gap-1">
              <VerificationIcon className="w-3.5 h-3.5" />
              {partnership.verificationMethod} verification
            </div>
          </div>

          {/* CTA */}
          <Button 
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleStartTask}
          >
            {partnership.callToAction}
          </Button>

          {/* Refresh */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-muted-foreground"
            onClick={loadPartnership}
            disabled={loading}
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} />
            See Different Opportunity
          </Button>
        </CardContent>
      </Card>

      {/* Task Completion Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{partnership.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">{partnership.description}</p>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs font-medium mb-2">Requirements:</p>
              <ul className="space-y-1">
                {(partnership.requirements || []).map((req, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            {renderVerification()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
