import { useEffect, useMemo, useState } from "react";
import {
  Search, Flame, Trophy, ChevronRight, Play, Activity, Store, Lightbulb,
  MapPin, CalendarDays, Users, Target, Gift, Quote, RefreshCw, Radio, ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo } from "@/lib/utils";
import { useDailyLimits } from "@/hooks/useDailyLimits";
import { WeekendBreakMessage } from "@/components/WeekendBreakMessage";
import { KycBanner } from "@/components/kyc";
import { rotate, nextRotationLabel, rotationSeed } from "@/lib/rotation";
import { buildCommunityStories } from "@/lib/community";
import { LOCAL_SERVICES } from "@/lib/lifestyle";

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-end justify-between mb-3">
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-xl bg-primary/10 text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="font-bold text-base leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {action && (
      <button onClick={onAction} className="text-xs font-medium text-primary flex items-center gap-0.5">
        {action} <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

const TIPS = [
  { title: "Stack your day the smart way", body: "Start with the partnered task (75 pts), then surveys (15 pts each). That's 120 of your 200 daily points before lunch.", tag: "Strategy" },
  { title: "Watch 80% or it doesn't count", body: "Watch & Earn only pays once you pass 80% of the video length. Don't skip ahead — the timer is checked server-side.", tag: "Watch & Earn" },
  { title: "Keep your streak alive", body: "Log in daily. Milestone bonuses hit at 7, 14 and 30 days, and a broken streak resets the ladder.", tag: "Streaks" },
  { title: "Cash out faster", body: "Verify your phone, complete KYC and invite 2 friends to unlock your first withdrawal. 150 points = K10.", tag: "Withdrawals" },
  { title: "KYC before you cash out", body: "Upload your NRC and a selfie once. Approved accounts get payouts processed the same day.", tag: "Verification" },
  { title: "Weekends are for resting", body: "Tasks are weekday-only unless a bonus campaign is live. Use weekends for games and the marketplace.", tag: "Schedule" },
  { title: "Games pay per play", body: "Each mini game pays up to 10 points and you get one play per game per day. Aim for the high score.", tag: "Games" },
  { title: "Transfers cost 5%", body: "Sending points to a friend charges a 5% fee and needs admin approval. Double-check the recipient email.", tag: "Transfers" },
];

const FALLBACK_BRANDS = [
  { company_name: "Zamtel Digital", industry: "Telecoms", city: "Lusaka", description: "Data bundles and airtime rewards for active earners." },
  { company_name: "Shoprite Zambia", industry: "Retail", city: "Nationwide", description: "Grocery vouchers redeemable in the marketplace." },
  { company_name: "Hungry Lion", industry: "Food", city: "Lusaka", description: "Meal deals for streak holders and top earners." },
  { company_name: "Pulse Fitness", industry: "Fitness", city: "Lusaka", description: "Day passes for consistent streak holders." },
];

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { hasReachedDailyCap, isWeekendBlocked, maxDailyPoints } = useDailyLimits();
  const seed = rotationSeed();

  /* ---------------- Live activity (realtime) ---------------- */
  const { data: liveFeed } = useQuery({
    queryKey: ["discover-live-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, description, points_amount, created_at")
        .eq("status", "completed")
        .gt("points_amount", 0)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      const labels: Record<string, string> = {
        task_completion: "Task completed",
        survey_completion: "Survey completed",
        video_reward: "Ad watched",
        game: "Mini game won",
        game_play: "Mini game won",
        referral_bonus: "Referral bonus",
        streak_milestone: "Streak milestone",
        redemption: "Reward redeemed",
        tier_upgrade: "Tier upgraded",
        withdrawal: "Payout requested",
      };
      return (data || []).map((tx) => ({
        id: tx.id,
        label: labels[tx.type || ""] || "Points earned",
        detail: (tx.description || "").replace(/^Completed (task|survey): /, "").slice(0, 60),
        points: tx.points_amount || 0,
        time: formatTimeAgo(tx.created_at || new Date().toISOString()),
      }));
    },
    refetchInterval: 20000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("discover-live-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["discover-live-activity"] });
        queryClient.invalidateQueries({ queryKey: ["discover-stories"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  /* ---------------- Data ---------------- */
  const { data: trendingTasks, isLoading: trendingLoading } = useQuery({
    queryKey: ["discover-trending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, category, points_reward, difficulty")
        .eq("is_active", true)
        .order("points_reward", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: brands } = useQuery({
    queryKey: ["discover-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, company_name, industry, city, description, logo_url")
        .eq("is_listed", true)
        .limit(8);
      if (error) return [];
      return data || [];
    },
  });

  const { data: rewards } = useQuery({
    queryKey: ["discover-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("id, name, description, points_cost, category, image, stock")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["discover-events"],
    queryFn: async () => {
      const [tournaments, campaigns] = await Promise.all([
        supabase
          .from("game_tournaments")
          .select("id, name, description, game_type, start_time, end_time, prize_pool, status")
          .gte("end_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(4),
        supabase
          .from("weekend_campaigns")
          .select("id, name, description, start_date, end_date, bonus_multiplier")
          .eq("is_active", true)
          .gte("end_date", new Date().toISOString().slice(0, 10))
          .limit(3),
      ]);

      const list: { id: string; title: string; body: string; when: string; badge: string }[] = [];
      (tournaments.data || []).forEach((t) =>
        list.push({
          id: t.id,
          title: t.name,
          body: t.description || `${t.game_type?.replace("_", " ")} tournament`,
          when: new Date(t.start_time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
          badge: `${t.prize_pool} pts pool`,
        })
      );
      (campaigns.data || []).forEach((c) =>
        list.push({
          id: c.id,
          title: c.name,
          body: c.description || "Bonus earning campaign is live.",
          when: `${new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(c.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
          badge: `${c.bonus_multiplier || 1}x bonus`,
        })
      );
      return list;
    },
  });

  const { data: storyTxs } = useQuery({
    queryKey: ["discover-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, description, points_amount, created_at, users(full_name)")
        .eq("status", "completed")
        .gt("points_amount", 0)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((tx: Record<string, unknown>) => ({
        id: tx.id as string,
        type: tx.type as string | null,
        description: tx.description as string | null,
        points_amount: tx.points_amount as number | null,
        created_at: tx.created_at as string | null,
        user_name: (tx.users as { full_name?: string } | null)?.full_name ?? null,
      }));
    },
    refetchInterval: 30000,
  });

  const { data: leaders } = useQuery({
    queryKey: ["discover-leaders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, total_points, vip_tier")
        .order("total_points", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []).map((u, i) => ({
        id: u.id,
        name: u.full_name || "Anonymous",
        points: u.total_points || 0,
        tier: u.vip_tier || "bronze",
        rank: i + 1,
        initials: (u.full_name || "A").slice(0, 2).toUpperCase(),
      }));
    },
  });

  /* ---------------- Rotated content (every 3 hours) ---------------- */
  const rotatedTrending = useMemo(() => rotate(trendingTasks, 1).slice(0, 8), [trendingTasks, seed]);
  const rotatedTips = useMemo(() => rotate(TIPS, 2).slice(0, 4), [seed]);
  const stories = useMemo(() => buildCommunityStories(storyTxs, 0, 6), [storyTxs, seed]);

  const lifestyleOffers = useMemo(() => {
    const marketplace = (rewards || []).map((r) => ({
      id: r.id,
      name: r.name,
      meta: `${r.points_cost} pts`,
      sub: (r.stock ?? 0) > 0 ? `${r.stock} left` : "Sold out",
      emoji: "🎁",
      go: "/marketplace",
    }));
    const services = LOCAL_SERVICES.map((s) => ({
      id: s.id,
      name: s.name,
      meta: s.perk,
      sub: `${s.category} · ${s.city}`,
      emoji: s.emoji,
      go: "/lifestyle",
    }));
    return rotate([...marketplace, ...services], 3).slice(0, 6);
  }, [rewards, seed]);

  const brandList = useMemo(
    () => rotate((brands && brands.length ? brands : FALLBACK_BRANDS) as Record<string, string>[], 4).slice(0, 4),
    [brands, seed]
  );

  /* ---------------- Search ---------------- */
  const query = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!query) return null;
    const t = (trendingTasks || [])
      .filter((x) => `${x.title} ${x.description} ${x.category}`.toLowerCase().includes(query))
      .slice(0, 5)
      .map((x) => ({ id: x.id, label: x.title, meta: `${x.points_reward} pts · task`, go: "/earn" }));
    const r = (rewards || [])
      .filter((x) => `${x.name} ${x.description} ${x.category}`.toLowerCase().includes(query))
      .slice(0, 5)
      .map((x) => ({ id: x.id, label: x.name, meta: `${x.points_cost} pts · reward`, go: "/marketplace" }));
    const l = LOCAL_SERVICES
      .filter((x) => `${x.name} ${x.category} ${x.city}`.toLowerCase().includes(query))
      .slice(0, 4)
      .map((x) => ({ id: x.id, label: x.name, meta: `${x.category} · ${x.city}`, go: "/lifestyle" }));
    const b = ((brands && brands.length ? brands : FALLBACK_BRANDS) as Record<string, string>[])
      .filter((x) => `${x.company_name} ${x.industry}`.toLowerCase().includes(query))
      .slice(0, 3)
      .map((x, i) => ({ id: x.id || `b-${i}`, label: x.company_name, meta: `${x.industry || "Brand"} · spotlight`, go: "/discover" }));
    return [...t, ...r, ...l, ...b];
  }, [query, trendingTasks, rewards, brands]);

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 bg-background">
      <div className="max-w-md mx-auto space-y-7">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
          <p className="text-sm text-muted-foreground">Everything happening on Boycott today</p>
        </header>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value.slice(0, 60))}
            placeholder="Search tasks, rewards, places, brands…"
            className="pl-9 rounded-2xl h-11 bg-secondary/40 border-border"
            aria-label="Search Boycott"
          />
        </div>

        {searchResults && (
          <Card className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {searchResults.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No matches for “{search}”.</p>
            ) : (
              searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(r.go)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.meta}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </Card>
        )}

        {/* Live activity */}
        <section>
          <SectionHeader
            icon={Activity}
            title="Live Activity"
            subtitle="Real-time earnings across the platform"
            action="History"
            onAction={() => navigate("/transactions")}
          />
          <Card className="rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <p className="text-[11px] font-medium text-primary">Live</p>
              <Radio className="w-3 h-3 text-primary ml-auto" />
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {(liveFeed || []).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{a.label}</p>
                    {a.detail && <p className="text-[11px] text-muted-foreground truncate">{a.detail}</p>}
                    <p className="text-[10px] text-muted-foreground">{a.time}</p>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">+{a.points}</span>
                </div>
              ))}
              {(!liveFeed || liveFeed.length === 0) && (
                <p className="p-4 text-sm text-muted-foreground">Nothing yet today — get the feed moving.</p>
              )}
            </div>
          </Card>
        </section>

        {/* KYC prompt */}
        <KycBanner action="cash out" />

        {isWeekendBlocked && <WeekendBreakMessage compact />}
        {!isWeekendBlocked && hasReachedDailyCap && (
          <Card className="rounded-2xl p-4 border border-primary/30 bg-primary/5 text-center">
            <p className="text-sm font-semibold text-primary">Daily cap reached 🎉</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All {maxDailyPoints} points claimed. Tasks, surveys, ads and games unlock again at midnight.
            </p>
          </Card>
        )}

        {/* Trending */}
        <section>
          <SectionHeader
            icon={Flame}
            title="Trending on Boycott"
            subtitle={`Reshuffles in ${nextRotationLabel()}`}
            action="Earn"
            onAction={() => navigate("/earn")}
          />
          {trendingLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {rotatedTrending.map((t, i) => (
                <Card
                  key={t.id}
                  onClick={() => navigate("/earn")}
                  className="min-w-[68%] snap-start rounded-2xl p-3 border border-border bg-gradient-card cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className="text-[10px] capitalize">#{i + 1} {t.category?.replace("_", " ")}</Badge>
                    <span className="text-xs font-bold text-primary">+{t.points_reward}</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug line-clamp-1">{t.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Brand spotlights */}
        <section>
          <SectionHeader icon={Store} title="Featured Brand Spotlights" subtitle="Partners running campaigns with us" />
          <div className="space-y-2">
            {brandList.map((b, i) => (
              <Card key={b.id || i} className="rounded-2xl p-3 border border-border flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  {(b.company_name || "B").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{b.company_name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{b.description || b.industry}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{b.industry || "Partner"}</Badge>
              </Card>
            ))}
          </div>
        </section>

        {/* Lifestyle */}
        <section>
          <SectionHeader
            icon={MapPin}
            title="Lifestyle"
            subtitle={`Marketplace offers & local spots · reshuffles in ${nextRotationLabel()}`}
            action="See all"
            onAction={() => navigate("/lifestyle")}
          />
          <div className="grid grid-cols-2 gap-3">
            {lifestyleOffers.map((o) => (
              <Card
                key={o.id}
                onClick={() => navigate(o.go)}
                className="rounded-2xl p-3 border border-border cursor-pointer bg-gradient-card"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg leading-none">{o.emoji}</span>
                  <RefreshCw className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold leading-snug line-clamp-2">{o.name}</p>
                <p className="text-xs text-primary font-bold mt-1 line-clamp-1">{o.meta}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{o.sub}</p>
              </Card>
            ))}
          </div>
          <Button variant="secondary" onClick={() => navigate("/lifestyle")} className="w-full rounded-2xl h-11 mt-3">
            <Gift className="w-4 h-4 mr-2" /> Open the full Lifestyle panel
          </Button>
        </section>

        {/* Upcoming events */}
        <section>
          <SectionHeader icon={CalendarDays} title="Upcoming Events" subtitle="Tournaments and bonus campaigns" action="Games" onAction={() => navigate("/games")} />
          {events && events.length > 0 ? (
            <div className="space-y-2">
              {events.map((e) => (
                <Card key={e.id} className="rounded-2xl p-3 border border-border flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{e.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{e.when}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{e.badge}</Badge>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl p-4 border border-dashed border-border text-center">
              <p className="text-sm text-muted-foreground">No events scheduled right now — check back soon.</p>
            </Card>
          )}
        </section>

        {/* Community stories */}
        <section>
          <SectionHeader
            icon={Users}
            title="Community Stories"
            subtitle={`Wins from the fam · reshuffles in ${nextRotationLabel()}`}
            action="See more"
            onAction={() => navigate("/community")}
          />
          <Card
            onClick={() => navigate("/community")}
            className="rounded-2xl border border-border divide-y divide-border overflow-hidden cursor-pointer"
          >
            {stories.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{s.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-semibold">{s.name}</span>{" "}
                    <span className="text-muted-foreground">{s.headline}</span>
                    {s.detail && <span className="text-muted-foreground"> — {s.detail}</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.city} · {s.time}</p>
                </div>
                <span className="text-xs font-bold text-primary shrink-0">+{s.points}</span>
              </div>
            ))}
            {stories.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No activity yet today. Be the first.</p>
            )}
            <div className="p-3 flex items-center justify-center gap-1 text-xs font-medium text-primary">
              See all community stories <ChevronRight className="w-3 h-3" />
            </div>
          </Card>
        </section>

        {/* Tips & guides */}
        <section>
          <SectionHeader
            icon={Lightbulb}
            title="Tips & Guides"
            subtitle={`Fresh set every 3 hours · next in ${nextRotationLabel()}`}
            action="FAQ"
            onAction={() => navigate("/faq")}
          />
          <div className="space-y-2">
            {rotatedTips.map((tip) => (
              <Card key={tip.title} className="rounded-2xl p-3 border border-border">
                <div className="flex items-start gap-2">
                  <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{tip.title}</p>
                      <Badge variant="secondary" className="text-[9px]">{tip.tag}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{tip.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Leaderboard */}
        <section>
          <SectionHeader icon={Trophy} title="Leaderboard" subtitle="Top earners of all time" action="Full board" onAction={() => navigate("/leaderboard")} />
          <Card className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {(leaders || []).map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3">
                <span className={`w-6 text-center text-xs font-bold ${l.rank === 1 ? "text-accent" : "text-muted-foreground"}`}>
                  {l.rank}
                </span>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-[10px] bg-secondary">{l.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{l.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{l.tier} tier</p>
                </div>
                <span className="text-xs font-bold text-primary">{l.points.toLocaleString()}</span>
              </div>
            ))}
            {(!leaders || leaders.length === 0) && <p className="p-4 text-sm text-muted-foreground">Leaderboard warming up…</p>}
          </Card>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate("/earn")} className="rounded-2xl h-12">
            <Target className="w-4 h-4 mr-2" /> Start earning
          </Button>
          <Button variant="secondary" onClick={() => navigate("/videos")} className="rounded-2xl h-12">
            <Play className="w-4 h-4 mr-2" /> Watch & earn
          </Button>
        </div>
      </div>
    </div>
  );
}
