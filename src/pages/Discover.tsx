import { useState, useMemo } from "react";
import {
  Search, Sparkles, Flame, Trophy, Crown, Star, ChevronRight, Play,
  Newspaper, Store, Lightbulb, MapPin, CalendarDays, Users, Zap, Target, Gift, Quote
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatTimeAgo } from "@/lib/utils";
import { useDailyLimits } from "@/hooks/useDailyLimits";
import { DailyLimitsProgress } from "@/components/DailyLimitsProgress";
import { DailyCapReached } from "@/components/DailyCapReached";
import { WeekendBreakMessage } from "@/components/WeekendBreakMessage";

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
  {
    title: "Stack your day the smart way",
    body: "Start with the partnered task (75 pts), then surveys (15 pts each). That's 120 of your 200 daily points before lunch.",
    tag: "Strategy",
  },
  {
    title: "Watch 80% or it doesn't count",
    body: "Watch & Earn only pays once you pass 80% of the video length. Don't skip ahead — the timer is checked server-side.",
    tag: "Watch & Earn",
  },
  {
    title: "Keep your streak alive",
    body: "Log in daily. Milestone bonuses hit at 7, 14 and 30 days, and a broken streak resets the ladder.",
    tag: "Streaks",
  },
  {
    title: "Cash out faster",
    body: "Verify your phone and invite 2 friends to unlock your first withdrawal. 150 points = K10.",
    tag: "Withdrawals",
  },
];

const FALLBACK_BRANDS = [
  { company_name: "Zamtel Digital", industry: "Telecoms", city: "Lusaka", description: "Data bundles and airtime rewards for active earners." },
  { company_name: "Shoprite Zambia", industry: "Retail", city: "Nationwide", description: "Grocery vouchers redeemable in the marketplace." },
  { company_name: "Hungry Lion", industry: "Food", city: "Lusaka", description: "Meal deals for streak holders and top earners." },
];

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: dailyData, hasReachedDailyCap, isWeekendBlocked, totalPointsEarned, maxDailyPoints } = useDailyLimits();

  const { data: userProfile } = useQuery({
    queryKey: ["discover-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("full_name, total_points, current_streak, vip_tier, level")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: trendingTasks, isLoading: trendingLoading } = useQuery({
    queryKey: ["discover-trending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, category, points_reward, difficulty")
        .eq("is_active", true)
        .order("points_reward", { ascending: false })
        .limit(12);
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
        .limit(6);
      if (error) return [];
      return data || [];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["discover-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("id, name, description, points_cost, category, image, stock")
        .eq("is_active", true)
        .order("points_cost", { ascending: true })
        .limit(8);
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

  const { data: stories } = useQuery({
    queryKey: ["discover-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, description, points_amount, created_at")
        .eq("status", "completed")
        .gt("points_amount", 0)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      const verbs: Record<string, string> = {
        task_completion: "smashed a task",
        survey_completion: "finished a survey",
        video_reward: "watched an ad",
        game: "won a mini game",
        referral_bonus: "brought in a friend",
        streak_milestone: "hit a streak milestone",
        redemption: "redeemed a reward",
      };
      return (data || []).map((tx) => ({
        id: tx.id,
        headline: verbs[tx.type || ""] || "earned points",
        detail: (tx.description || "").replace(/^Completed (task|survey): /, "").slice(0, 60),
        points: tx.points_amount || 0,
        time: formatTimeAgo(tx.created_at || new Date().toISOString()),
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

  const query = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!query) return null;
    const t = (trendingTasks || [])
      .filter((x) => `${x.title} ${x.description} ${x.category}`.toLowerCase().includes(query))
      .slice(0, 5)
      .map((x) => ({ id: x.id, label: x.title, meta: `${x.points_reward} pts · task`, go: "/earn" }));
    const r = (deals || [])
      .filter((x) => `${x.name} ${x.description} ${x.category}`.toLowerCase().includes(query))
      .slice(0, 5)
      .map((x) => ({ id: x.id, label: x.name, meta: `${x.points_cost} pts · reward`, go: "/marketplace" }));
    const b = (brands && brands.length ? brands : FALLBACK_BRANDS)
      .filter((x: any) => `${x.company_name} ${x.industry}`.toLowerCase().includes(query))
      .slice(0, 3)
      .map((x: any, i: number) => ({ id: x.id || `b-${i}`, label: x.company_name, meta: `${x.industry || "Brand"} · spotlight`, go: "/discover" }));
    return [...t, ...r, ...b];
  }, [query, trendingTasks, deals, brands]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const slots = [
    { label: "Partner", value: dailyData?.partnered_tasks, pts: 75 },
    { label: "Surveys", value: dailyData?.surveys, pts: 15 },
    { label: "Games", value: dailyData?.games, pts: 10 },
    { label: "Ads", value: dailyData?.videos, pts: 5 },
    { label: "Tasks", value: dailyData?.regular_tasks, pts: 13 },
  ];

  const brandList = (brands && brands.length ? brands : FALLBACK_BRANDS) as any[];

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 bg-background">
      <div className="max-w-md mx-auto space-y-7">
        {/* Header */}
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
            placeholder="Search tasks, rewards, brands…"
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

        {/* Daily briefing */}
        <section>
          <SectionHeader icon={Newspaper} title="Daily Briefing" subtitle={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} />
          <Card className="bg-gradient-card rounded-2xl p-4 border border-border shadow-card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {greeting}, {userProfile?.full_name?.split(" ")[0] || "earner"} 👋
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasReachedDailyCap
                    ? "You've maxed out today's cap. Nice work."
                    : `${Math.max(0, maxDailyPoints - totalPointsEarned)} points still on the table today.`}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 capitalize">
                <Crown className="w-3 h-3 mr-1" />
                {userProfile?.vip_tier || "bronze"}
              </Badge>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Daily cap</span>
                <span className="font-semibold">{totalPointsEarned}/{maxDailyPoints} pts</span>
              </div>
              <Progress value={(totalPointsEarned / maxDailyPoints) * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {slots.map((s) => (
                <div key={s.label} className="rounded-xl bg-secondary/40 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                  <p className="text-xs font-bold">
                    {s.value?.completed ?? 0}/{s.value?.max ?? 0}
                  </p>
                  <p className="text-[9px] text-primary">{s.pts} pts</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-semibold">{userProfile?.current_streak || 0}</span>
                <span className="text-muted-foreground">day streak</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold">{userProfile?.total_points || 0}</span>
                <span className="text-muted-foreground">total pts</span>
              </div>
            </div>
          </Card>
        </section>

        {isWeekendBlocked && <WeekendBreakMessage />}
        {!isWeekendBlocked && hasReachedDailyCap && <DailyCapReached />}

        {/* Trending */}
        <section>
          <SectionHeader icon={Flame} title="Trending on Boycott" subtitle="What everyone is grinding right now" action="Earn" onAction={() => navigate("/earn")} />
          {trendingLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
              {(trendingTasks || []).slice(0, 8).map((t, i) => (
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
            {brandList.slice(0, 4).map((b, i) => (
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

        {/* Lifestyle / local deals */}
        <section>
          <SectionHeader icon={MapPin} title="Lifestyle" subtitle="Local deals & discovery in Zambia" action="Marketplace" onAction={() => navigate("/marketplace")} />
          <div className="grid grid-cols-2 gap-3">
            {(deals || []).slice(0, 4).map((d) => (
              <Card
                key={d.id}
                onClick={() => navigate("/marketplace")}
                className="rounded-2xl p-3 border border-border cursor-pointer bg-gradient-card"
              >
                <div className="flex items-center justify-between mb-1">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-[10px] text-muted-foreground capitalize">{d.category || "reward"}</span>
                </div>
                <p className="text-sm font-semibold leading-snug line-clamp-2">{d.name}</p>
                <p className="text-xs text-primary font-bold mt-1">{d.points_cost} pts</p>
                <p className="text-[10px] text-muted-foreground">{d.stock > 0 ? `${d.stock} left` : "Out of stock"}</p>
              </Card>
            ))}
          </div>
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
          <SectionHeader icon={Users} title="Community Stories" subtitle="Live wins from the Boycott fam" />
          <Card className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {(stories || []).slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">BC</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-semibold">A member</span>{" "}
                    <span className="text-muted-foreground">{s.headline}</span>
                    {s.detail && <span className="text-muted-foreground"> — {s.detail}</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.time}</p>
                </div>
                <span className="text-xs font-bold text-primary shrink-0">+{s.points}</span>
              </div>
            ))}
            {(!stories || stories.length === 0) && (
              <p className="p-4 text-sm text-muted-foreground">No activity yet today. Be the first.</p>
            )}
          </Card>
        </section>

        {/* Tips & guides */}
        <section>
          <SectionHeader icon={Lightbulb} title="Tips & Guides" subtitle="Earn smarter, not harder" action="FAQ" onAction={() => navigate("/faq")} />
          <div className="space-y-2">
            {TIPS.map((tip) => (
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

        {/* Daily limits detail */}
        <DailyLimitsProgress />

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
