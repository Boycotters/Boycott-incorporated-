import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, Sparkles, Check, Lock, Trophy, Clock, Frame, Medal, Palette, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  reward_id: string;
  item_type: string;
  is_equipped: boolean;
  created_at: string;
  expires_at: string | null;
  rewards: { id: string; name: string; description: string | null; image: string | null; category: string | null } | null;
}

interface Perk {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  unlock_achievement_id: string | null;
  achievements: { id: string; name: string; description: string | null; icon: string; requirement_type: string; requirement_value: number } | null;
}

const TYPE_META: Record<string, { label: string; icon: typeof Frame }> = {
  avatar_frame: { label: "Frames", icon: Frame },
  badge: { label: "Badges", icon: Medal },
  theme: { label: "Themes", icon: Palette },
  item: { label: "Items", icon: Gift },
};

const typeOf = (name: string) =>
  /frame/i.test(name) ? "avatar_frame" : /badge/i.test(name) ? "badge" : /theme/i.test(name) ? "theme" : "item";

const REQ_LABEL: Record<string, string> = {
  tasks_completed: "tasks completed",
  points_earned: "points earned",
  referrals_made: "referrals",
  level_reached: "level",
  streak_days: "day streak",
};

export function UserInventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["user-inventory", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_inventory")
        .select("id, reward_id, item_type, is_equipped, created_at, expires_at, rewards (id, name, description, image, category)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as InventoryItem[];
    },
    enabled: !!user?.id,
  });

  const { data: perks } = useQuery({
    queryKey: ["achievement-perks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("id, name, description, image, unlock_achievement_id, achievements:unlock_achievement_id (id, name, description, icon, requirement_type, requirement_value)")
        .eq("is_active", true)
        .eq("unlock_type", "achievement");
      if (error) throw error;
      return (data || []) as unknown as Perk[];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["perk-progress", user?.id],
    queryFn: async () => {
      const [u, t, r] = await Promise.all([
        supabase.from("users").select("total_points, level, current_streak").eq("id", user!.id).maybeSingle(),
        supabase.from("user_tasks").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "completed"),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user!.id),
      ]);
      return {
        points_earned: u.data?.total_points || 0,
        level_reached: u.data?.level || 1,
        streak_days: u.data?.current_streak || 0,
        tasks_completed: t.count || 0,
        referrals_made: r.count || 0,
      } as Record<string, number>;
    },
    enabled: !!user?.id,
  });

  const equipMutation = useMutation({
    mutationFn: async ({ inventoryId, equip }: { inventoryId: string; equip: boolean }) => {
      const { data, error } = await supabase.rpc("equip_inventory_item", {
        p_user_id: user!.id,
        p_inventory_id: inventoryId,
        p_equip: equip,
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
        queryClient.invalidateQueries({ queryKey: ["equipped-items"] });
      } else toast.error(data?.message || "Could not update item");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update item"),
  });

  const ownedIds = useMemo(() => new Set((inventory || []).map((i) => i.reward_id)), [inventory]);
  const activeItems = (inventory || []).filter((i) => !i.expires_at || new Date(i.expires_at) > new Date());
  const lockedPerks = (perks || []).filter((p) => !ownedIds.has(p.id));
  const filtered = filter === "all" ? activeItems : activeItems.filter((i) => i.item_type === filter);
  const totalPerks = (perks || []).length;
  const unlockedPerks = (perks || []).filter((p) => ownedIds.has(p.id)).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Collection summary */}
      <Card className="p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-card to-card border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Perk collection</p>
              <p className="text-xs text-muted-foreground">Unlocked by finishing challenges & achievements</p>
            </div>
          </div>
          <span className="text-lg font-bold text-primary">
            {unlockedPerks}/{totalPerks}
          </span>
        </div>
        <Progress value={totalPerks ? (unlockedPerks / totalPerks) * 100 : 0} className="h-2" />
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-xl bg-background/60 py-2">
            <p className="text-base font-bold">{activeItems.length}</p>
            <p className="text-[10px] text-muted-foreground">Owned</p>
          </div>
          <div className="rounded-xl bg-background/60 py-2">
            <p className="text-base font-bold">{activeItems.filter((i) => i.is_equipped).length}</p>
            <p className="text-[10px] text-muted-foreground">Equipped</p>
          </div>
          <div className="rounded-xl bg-background/60 py-2">
            <p className="text-base font-bold">{lockedPerks.length}</p>
            <p className="text-[10px] text-muted-foreground">To unlock</p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="owned">
        <TabsList className="grid grid-cols-2 w-full rounded-xl">
          <TabsTrigger value="owned">My items</TabsTrigger>
          <TabsTrigger value="locked">Locked perks</TabsTrigger>
        </TabsList>

        <TabsContent value="owned" className="space-y-3 mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", "avatar_frame", "badge", "theme", "item"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs border whitespace-nowrap transition-colors",
                  filter === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                )}
              >
                {t === "all" ? "All" : TYPE_META[t].label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-6 rounded-2xl text-center">
              <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Nothing here yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete achievements to unlock perks.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((item) => {
                const Icon = (TYPE_META[item.item_type] || TYPE_META.item).icon;
                const daysLeft = item.expires_at
                  ? Math.max(0, Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000))
                  : null;
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "p-3 rounded-2xl flex flex-col gap-2 transition-all",
                      item.is_equipped && "ring-2 ring-primary/50 bg-primary/5"
                    )}
                  >
                    <div className="relative aspect-square rounded-xl bg-muted/60 flex items-center justify-center overflow-hidden">
                      {item.rewards?.image ? (
                        <img src={item.rewards.image} alt={item.rewards?.name || "Perk"} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="w-10 h-10 text-primary" />
                      )}
                      {item.is_equipped && (
                        <Badge className="absolute top-1.5 left-1.5 text-[10px] h-5 px-1.5">
                          <Check className="w-3 h-3 mr-0.5" /> Active
                        </Badge>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.rewards?.name || "Perk"}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {daysLeft === null ? (
                          <>
                            <Sparkles className="w-3 h-3" /> Permanent
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> {daysLeft}d left
                          </>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={item.is_equipped ? "outline" : "default"}
                      className="h-8 text-xs rounded-lg"
                      disabled={equipMutation.isPending}
                      onClick={() => equipMutation.mutate({ inventoryId: item.id, equip: !item.is_equipped })}
                    >
                      {item.is_equipped ? "Unequip" : "Equip"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="locked" className="space-y-2 mt-3">
          {lockedPerks.length === 0 ? (
            <Card className="p-6 rounded-2xl text-center">
              <Trophy className="w-10 h-10 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">You've unlocked every perk. Legend!</p>
            </Card>
          ) : (
            lockedPerks.map((perk) => {
              const a = perk.achievements;
              const current = a ? progress?.[a.requirement_type] || 0 : 0;
              const pct = a ? Math.min(100, (current / Math.max(1, a.requirement_value)) * 100) : 0;
              const Icon = TYPE_META[typeOf(perk.name)].icon;
              return (
                <Card key={perk.id} className="p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-muted-foreground" />
                      <Lock className="w-3.5 h-3.5 absolute -bottom-1 -right-1 text-foreground bg-background rounded-full p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{perk.name}</p>
                      {a ? (
                        <>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {a.icon} {a.name} — {Math.min(current, a.requirement_value)}/{a.requirement_value}{" "}
                            {REQ_LABEL[a.requirement_type] || ""}
                          </p>
                          <Progress value={pct} className="h-1.5 mt-1.5" />
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Unlocked through special challenges</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
