import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Search, RefreshCw, Gift, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LOCAL_SERVICES, LIFESTYLE_CATEGORIES } from "@/lib/lifestyle";
import { rotate, nextRotationLabel } from "@/lib/rotation";

export default function Lifestyle() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  const { data: rewards } = useQuery({
    queryKey: ["lifestyle-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("id, name, description, points_cost, category, image, stock")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const offers = useMemo(() => {
    const marketplace = (rewards || []).map((r) => ({
      id: r.id,
      kind: "marketplace" as const,
      name: r.name,
      blurb: r.description || "Redeem with your points",
      category: "Marketplace",
      subCategory: r.category || "reward",
      points: r.points_cost,
      stock: r.stock,
      emoji: "🎁",
      city: "Nationwide",
    }));
    const services = LOCAL_SERVICES.map((s) => ({
      id: s.id,
      kind: "service" as const,
      name: s.name,
      blurb: s.blurb,
      category: s.category,
      subCategory: s.perk,
      points: null as number | null,
      stock: null as number | null,
      emoji: s.emoji,
      city: s.city,
    }));
    return rotate([...marketplace, ...services], 3);
  }, [rewards]);

  const filtered = offers.filter((o) => {
    const matchCat = category === "All" || o.category === category;
    const q = search.trim().toLowerCase();
    const matchQ = !q || `${o.name} ${o.blurb} ${o.subCategory} ${o.city}`.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="min-h-screen pb-28 px-4 pt-6 bg-background">
      <div className="max-w-md mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lifestyle</h1>
            <p className="text-xs text-muted-foreground">Marketplace offers and local spots across Zambia</p>
          </div>
        </header>

        <Card className="rounded-2xl p-3 border border-border flex items-center gap-2 bg-gradient-card">
          <RefreshCw className="w-4 h-4 text-primary" />
          <p className="text-xs text-muted-foreground">
            Offers reshuffle every 3 hours — next refresh in <span className="font-semibold text-foreground">{nextRotationLabel()}</span>
          </p>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value.slice(0, 60))}
            placeholder="Search offers, food places, deals…"
            className="pl-9 rounded-2xl h-11 bg-secondary/40"
            aria-label="Search lifestyle offers"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {LIFESTYLE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} offers</p>

        <div className="space-y-2">
          {filtered.map((o) => (
            <Card
              key={o.id}
              onClick={() => o.kind === "marketplace" && navigate("/marketplace")}
              className={`rounded-2xl p-3 border border-border flex items-center gap-3 ${o.kind === "marketplace" ? "cursor-pointer" : ""}`}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
                {o.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{o.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{o.blurb}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[9px]">{o.category}</Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" /> {o.city}
                  </span>
                </div>
              </div>
              {o.points !== null ? (
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-primary">{o.points} pts</p>
                  <p className="text-[10px] text-muted-foreground">{(o.stock ?? 0) > 0 ? `${o.stock} left` : "Sold out"}</p>
                </div>
              ) : (
                <Badge variant="outline" className="text-[9px] shrink-0 max-w-[90px] text-center whitespace-normal">
                  {o.subCategory}
                </Badge>
              )}
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="rounded-2xl p-6 text-center border border-dashed">
              <p className="text-sm text-muted-foreground">Nothing matches that search.</p>
            </Card>
          )}
        </div>

        <Button onClick={() => navigate("/marketplace")} className="w-full rounded-2xl h-12">
          <Gift className="w-4 h-4 mr-2" /> Open Marketplace <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
