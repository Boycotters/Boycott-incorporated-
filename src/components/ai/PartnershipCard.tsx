import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake, Sparkles, ExternalLink, Clock, Coins, RefreshCw, CheckCircle } from "lucide-react";
import { useAI, PartnershipTask } from "@/hooks/useAI";
import { cn } from "@/lib/utils";

interface PartnershipCardProps {
  brandCategory?: string;
  targetAudience?: string;
  campaignType?: string;
  onStartTask?: (task: PartnershipTask) => void;
}

const verificationIcons = {
  url: ExternalLink,
  screenshot: CheckCircle,
  survey: Sparkles,
  timer: Clock,
};

export function PartnershipCard({
  brandCategory = "technology",
  targetAudience = "young adults",
  campaignType = "brand_awareness",
  onStartTask
}: PartnershipCardProps) {
  const [partnership, setPartnership] = useState<PartnershipTask | null>(null);
  const { generatePartnership, loading, error } = useAI();

  const loadPartnership = async () => {
    const result = await generatePartnership(brandCategory, targetAudience, campaignType);
    if (result) {
      setPartnership(result);
    }
  };

  useEffect(() => {
    loadPartnership();
  }, [brandCategory, targetAudience, campaignType]);

  if (loading) {
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
            {partnership.requirements.slice(0, 3).map((req, i) => (
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
          onClick={() => onStartTask?.(partnership)}
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
  );
}
