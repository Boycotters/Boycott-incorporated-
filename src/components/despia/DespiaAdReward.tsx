import { useState, useEffect, useCallback } from "react";
import despia from "despia-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Play, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface DespiaAdRewardProps {
  rewardPoints?: number;
  buttonLabel?: string;
  className?: string;
  onRewardGranted?: (points: number) => void;
}

export function DespiaAdReward({
  rewardPoints = 15,
  buttonLabel = "Watch Ad",
  className,
  onRewardGranted,
}: DespiaAdRewardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const MAX_ADS_PER_DAY = 8;

  useEffect(() => {
    const native = navigator.userAgent.includes("despia");
    setIsNative(native);
  }, []);

  // Register global callback for rewarded ad completion
  useEffect(() => {
    (window as any).updateRewardedStatus = (status: string) => {
      if (!navigator.userAgent.includes("despia")) return;
      
      if (status === "true") {
        grantReward();
      } else {
        setIsLoading(false);
        toast.error("Ad was not completed. No reward granted.");
      }
    };

    return () => {
      delete (window as any).updateRewardedStatus;
    };
  }, [user?.id, adsWatchedToday]);

  const grantReward = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc("complete_ai_partner_task", {
        p_user_id: user.id,
        p_task_type: "ad_watch",
        p_task_title: "Rewarded Ad Watch",
        p_points_amount: rewardPoints,
        p_source: "admob_rewarded",
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast.success(`+${rewardPoints} points earned!`, {
          description: "Rewarded ad completed",
        });
        setAdsWatchedToday((prev) => prev + 1);
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["user-data"] });
        onRewardGranted?.(rewardPoints);
      } else {
        toast.info(result?.message || "Reward already claimed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to grant reward");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, rewardPoints, queryClient, onRewardGranted]);

  const handleWatchAd = () => {
    if (adsWatchedToday >= MAX_ADS_PER_DAY) {
      toast.info("Daily ad limit reached. Come back tomorrow!");
      return;
    }

    if (!isNative) {
      toast.info("Rewarded ads are available in the native app only.", {
        description: "Install the app from the store to watch ads and earn points.",
      });
      return;
    }

    setIsLoading(true);
    despia("displayrewardedad://");
  };

  return (
    <div className={className}>
      <Button
        onClick={handleWatchAd}
        disabled={isLoading || adsWatchedToday >= MAX_ADS_PER_DAY}
        className="w-full gap-2"
        variant="default"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {buttonLabel}
        <Badge variant="secondary" className="ml-1 gap-1 bg-primary-foreground/20 text-primary-foreground">
          <Coins className="w-3 h-3" />+{rewardPoints}
        </Badge>
      </Button>
      {!isNative && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Smartphone className="w-3 h-3" />
          Available in native app only
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        {adsWatchedToday}/{MAX_ADS_PER_DAY} ads watched today
      </p>
    </div>
  );
}
