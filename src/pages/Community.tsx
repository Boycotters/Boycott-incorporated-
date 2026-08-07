import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, RefreshCw, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildCommunityStories } from "@/lib/community";
import { nextRotationLabel } from "@/lib/rotation";

export default function Community() {
  const navigate = useNavigate();

  const { data: txs } = useQuery({
    queryKey: ["community-stories-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, description, points_amount, created_at, users(full_name)")
        .eq("status", "completed")
        .gt("points_amount", 0)
        .order("created_at", { ascending: false })
        .limit(40);
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

  const stories = useMemo(() => buildCommunityStories(txs, 0, 40), [txs]);

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 bg-background">
      <div className="max-w-md mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Community Stories</h1>
            <p className="text-xs text-muted-foreground">Wins from the Boycott fam across Zambia</p>
          </div>
        </header>

        <Card className="rounded-2xl p-3 border border-border flex items-center gap-2 bg-gradient-card">
          <RefreshCw className="w-4 h-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            Stories reshuffle every 3 hours — next refresh in <span className="font-semibold text-foreground">{nextRotationLabel()}</span>
          </p>
        </Card>

        <Card className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {stories.map((s) => (
            <div key={s.id} className="flex items-start gap-3 p-3">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{s.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold">{s.name}</p>
                  {s.isMember && <Badge variant="secondary" className="text-[9px]">Member</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.headline}
                  {s.detail && ` — ${s.detail}`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {s.city} · {s.time}
                </p>
              </div>
              <span className="text-xs font-bold text-primary shrink-0">+{s.points}</span>
            </div>
          ))}
          {stories.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">No stories yet. Be the first.</p>
          )}
        </Card>

        <Button onClick={() => navigate("/earn")} className="w-full rounded-2xl h-12">
          <Users className="w-4 h-4 mr-2" /> Make your own story
        </Button>
      </div>
    </div>
  );
}
