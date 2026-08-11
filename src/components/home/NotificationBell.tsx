import { useMemo, useState } from "react";
import { Bell, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { formatTimeAgo } from "@/lib/utils";

interface Rec {
  id: string;
  title: string;
  body: string;
  cta: string;
  go: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["home-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_queue")
        .select("id, title, body, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const { data: limits } = useQuery({
    queryKey: ["home-notif-limits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_comprehensive_daily_limits", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    enabled: !!user?.id && open,
  });

  const { data: profile } = useQuery({
    queryKey: ["home-notif-profile", user?.id],
    queryFn: async () => {
      const [u, kyc, refs] = await Promise.all([
        supabase.from("users").select("current_streak, total_points, vip_tier, phone_verified").eq("id", user!.id).maybeSingle(),
        supabase.from("kyc_verifications").select("status").eq("user_id", user!.id).maybeSingle(),
        supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", user!.id),
      ]);
      return {
        user: u.data,
        kycStatus: kyc.data?.status || "none",
        referrals: refs.count || 0,
      };
    },
    enabled: !!user?.id && open,
  });

  const recommendations = useMemo<Rec[]>(() => {
    const recs: Rec[] = [];
    const l = (limits || {}) as Record<string, any>;
    const cap = Number(l.daily_cap ?? l.cap ?? 200);
    const earned = Number(l.total_points_earned ?? l.points_earned_today ?? 0);
    const remaining = Math.max(0, cap - earned);

    if (remaining > 0) {
      recs.push({
        id: "rec-cap",
        title: `You still have ${remaining} points on the table`,
        body: "Our model says the fastest route today is the partnered task, then a survey.",
        cta: "Go to Earn",
        go: "/earn",
      });
      recs.push({
        id: "rec-video",
        title: "Watch & Earn is your quickest win",
        body: "Short clips pay 5 pts each once you pass 80% watch time — under 10 minutes total.",
        cta: "Watch now",
        go: "/videos",
      });
      recs.push({
        id: "rec-games",
        title: "One game play left today",
        body: "Games top up 10 pts a play and keep your activity score healthy.",
        cta: "Play",
        go: "/games",
      });
    } else {
      recs.push({
        id: "rec-done",
        title: "Daily cap reached — nice work",
        body: "Spend the points in the marketplace or bank them toward a withdrawal.",
        cta: "Marketplace",
        go: "/marketplace",
      });
    }

    const streak = profile?.user?.current_streak ?? 0;
    if (streak > 0) {
      recs.push({
        id: "rec-streak",
        title: `Day ${streak} streak — don't break it`,
        body: "Milestone bonuses land at 7, 14 and 30 days. Log in tomorrow to keep the ladder.",
        cta: "See streak",
        go: "/achievements",
      });
    }
    if (profile && profile.kycStatus !== "approved") {
      recs.push({
        id: "rec-kyc",
        title: "Finish identity verification",
        body: "KYC is required before your first cash-out. It takes about 2 minutes.",
        cta: "Verify",
        go: "/withdraw",
      });
    }
    if (profile && profile.referrals < 2) {
      recs.push({
        id: "rec-ref",
        title: `Invite ${2 - profile.referrals} more friend${2 - profile.referrals === 1 ? "" : "s"}`,
        body: "Two referrals unlock your first withdrawal, and each one pays you 50 pts.",
        cta: "Invite",
        go: "/referrals",
      });
    }
    recs.push({
      id: "rec-tier",
      title: "Your tier keeps paying while you save",
      body: "You keep earning at your current tier multiplier until you buy the next one.",
      cta: "View VIP",
      go: "/vip",
    });
    return recs;
  }, [limits, profile]);

  const unread = notifications.filter((n) => n.status === "pending").length;
  const badgeCount = unread || recommendations.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {badgeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[90vw] sm:max-w-sm overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Alerts and AI recommendations picked for you.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AI recommended
            </p>
            <div className="space-y-2">
              {recommendations.map((r) => (
                <Card key={r.id} className="p-3 rounded-2xl border border-border bg-gradient-card">
                  <p className="text-sm font-semibold leading-snug">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.body}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 h-8 rounded-xl text-xs"
                    onClick={() => { setOpen(false); navigate(r.go); }}
                  >
                    {r.cta}
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Recent activity</p>
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <Card key={n.id} className="p-3 rounded-2xl border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      {n.status === "pending" && <Badge variant="secondary" className="text-[10px]">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    {n.created_at && (
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTimeAgo(n.created_at)}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
