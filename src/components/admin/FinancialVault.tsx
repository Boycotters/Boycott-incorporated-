import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coins, TrendingDown, ArrowDownRight, Gift, Send, Wallet, DollarSign } from "lucide-react";

interface Row {
  id: string;
  category: "redemption" | "withdrawal" | "transfer" | "transaction";
  user_id: string | null;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export function FinancialVault() {
  const queryClient = useQueryClient();

  const { data: redemptions = [] } = useQuery({
    queryKey: ["fv-redemptions"],
    queryFn: async () => {
      const { data } = await supabase.from("redemptions").select("id, user_id, points_spent, status, created_at, reward_id").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["fv-withdrawals"],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("id, user_id, amount, net_amount, fee, provider, status, created_at").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["fv-transfers"],
    queryFn: async () => {
      const { data } = await supabase.from("point_transfers").select("id, sender_id, recipient_id, amount, fee, status, created_at").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  const { data: spendTx = [] } = useQuery({
    queryKey: ["fv-spend-tx"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, user_id, type, points_amount, description, status, created_at")
        .lt("points_amount", 0)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("financial-vault-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "redemptions" }, () => queryClient.invalidateQueries({ queryKey: ["fv-redemptions"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => queryClient.invalidateQueries({ queryKey: ["fv-withdrawals"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "point_transfers" }, () => queryClient.invalidateQueries({ queryKey: ["fv-transfers"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => queryClient.invalidateQueries({ queryKey: ["fv-spend-tx"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const rows: Row[] = useMemo(() => {
    const r: Row[] = [];
    redemptions.forEach((x: any) => r.push({ id: `red-${x.id}`, category: "redemption", user_id: x.user_id, amount: x.points_spent || 0, description: `Reward redemption`, status: x.status, created_at: x.created_at }));
    withdrawals.forEach((x: any) => r.push({ id: `wd-${x.id}`, category: "withdrawal", user_id: x.user_id, amount: x.amount || 0, description: `Withdrawal via ${x.provider} (fee ${x.fee || 0})`, status: x.status, created_at: x.created_at }));
    transfers.forEach((x: any) => r.push({ id: `tr-${x.id}`, category: "transfer", user_id: x.sender_id, amount: (x.amount || 0) + (x.fee || 0), description: `P2P transfer (fee ${x.fee || 0})`, status: x.status, created_at: x.created_at }));
    spendTx.forEach((x: any) => r.push({ id: `tx-${x.id}`, category: "transaction", user_id: x.user_id, amount: Math.abs(x.points_amount || 0), description: x.description || x.type, status: x.status, created_at: x.created_at }));
    return r.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [redemptions, withdrawals, transfers, spendTx]);

  const totals = useMemo(() => {
    return {
      redemption: redemptions.reduce((s: number, x: any) => s + (x.points_spent || 0), 0),
      withdrawal: withdrawals.reduce((s: number, x: any) => s + (x.amount || 0), 0),
      transfer: transfers.reduce((s: number, x: any) => s + (x.amount || 0) + (x.fee || 0), 0),
      other: spendTx.reduce((s: number, x: any) => s + Math.abs(x.points_amount || 0), 0),
      fees: withdrawals.reduce((s: number, x: any) => s + (x.fee || 0), 0) + transfers.reduce((s: number, x: any) => s + (x.fee || 0), 0),
    };
  }, [redemptions, withdrawals, transfers, spendTx]);

  const grandTotal = totals.redemption + totals.withdrawal + totals.transfer + totals.other;

  const iconFor = (cat: Row["category"]) => cat === "redemption" ? Gift : cat === "withdrawal" ? Wallet : cat === "transfer" ? Send : Coins;
  const colorFor = (cat: Row["category"]) => cat === "redemption" ? "text-purple-600" : cat === "withdrawal" ? "text-emerald-600" : cat === "transfer" ? "text-blue-600" : "text-amber-600";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><TrendingDown className="w-4 h-4 mx-auto text-primary mb-1" /><p className="text-xl font-bold">{grandTotal.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total pts spent</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><Gift className="w-4 h-4 mx-auto text-purple-600 mb-1" /><p className="text-xl font-bold">{totals.redemption.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Redemptions</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><Wallet className="w-4 h-4 mx-auto text-emerald-600 mb-1" /><p className="text-xl font-bold">{totals.withdrawal.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Withdrawals</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><Send className="w-4 h-4 mx-auto text-blue-600 mb-1" /><p className="text-xl font-bold">{totals.transfer.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">P2P Transfers</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><DollarSign className="w-4 h-4 mx-auto text-amber-600 mb-1" /><p className="text-xl font-bold">{totals.fees.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Fees collected</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowDownRight className="w-5 h-5 text-primary" /> Financial Vault — Points Spent Ledger</CardTitle>
          <CardDescription>Every point leaving user wallets, in real time. Newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">No spending activity yet.</p>
          ) : (
            <ScrollArea className="h-[440px] pr-2">
              <div className="space-y-1.5">
                {rows.map((row) => {
                  const Icon = iconFor(row.category);
                  return (
                    <div key={row.id} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
                      <Icon className={`w-4 h-4 shrink-0 ${colorFor(row.category)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{row.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {row.user_id ? `${row.user_id.slice(0, 8)}…` : "system"} • {new Date(row.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">{row.status}</Badge>
                      <span className="text-xs font-bold text-destructive shrink-0">-{row.amount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
