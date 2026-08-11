import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Loader2, MapPin, Ticket } from "lucide-react";

export interface DiscoverOffer {
  kind: "reward" | "service";
  id: string;
  name: string;
  emoji: string;
  meta: string;
  sub: string;
  description?: string | null;
  points?: number | null;
  stock?: number | null;
}

interface Props {
  offer: DiscoverOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfferPurchaseDialog({ offer, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wallet } = useQuery({
    queryKey: ["offer-wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("available_points")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const balance = wallet?.available_points ?? 0;
  const cost = offer?.points ?? 0;
  const canAfford = balance >= cost;
  const soldOut = offer?.kind === "reward" && (offer.stock ?? 0) <= 0;

  const redeem = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("redeem_reward", {
        p_user_id: user!.id,
        p_reward_id: offer!.id,
      });
      if (error) throw error;
      return data as unknown as { success: boolean; message?: string };
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success(res.message || "Redeemed! Check your inventory.");
        queryClient.invalidateQueries({ queryKey: ["offer-wallet"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["discover-rewards"] });
        onOpenChange(false);
      } else {
        toast.error(res?.message || "Could not redeem this item");
      }
    },
    onError: (e: Error) => toast.error(e.message || "Redemption failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl leading-none">{offer?.emoji}</span>
            {offer?.name}
          </DialogTitle>
          <DialogDescription>
            {offer?.kind === "reward"
              ? "Confirm your purchase — points are deducted instantly."
              : "Local partner perk available to Boycott members."}
          </DialogDescription>
        </DialogHeader>

        {offer && (
          <div className="space-y-3">
            {offer.description && (
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            )}

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  {offer.kind === "reward" ? <Coins className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
                  {offer.kind === "reward" ? "Price" : "Perk"}
                </span>
                <span className="font-semibold">{offer.meta}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Details
                </span>
                <span className="font-medium">{offer.sub}</span>
              </div>
              {offer.kind === "reward" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Your balance</span>
                  <Badge variant={canAfford ? "secondary" : "destructive"}>{balance} pts</Badge>
                </div>
              )}
            </div>

            {offer.kind === "service" && (
              <p className="text-xs text-muted-foreground">
                Show this screen at the counter to claim the perk. Offers rotate every 3 hours.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {offer?.kind === "reward" ? (
            <Button
              className="rounded-xl"
              disabled={!canAfford || soldOut || redeem.isPending}
              onClick={() => redeem.mutate()}
            >
              {redeem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {soldOut ? "Sold out" : canAfford ? `Buy for ${cost} pts` : "Not enough points"}
            </Button>
          ) : (
            <Button className="rounded-xl" onClick={() => { toast.success("Perk claimed — show it in-store."); onOpenChange(false); }}>
              Claim perk
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
