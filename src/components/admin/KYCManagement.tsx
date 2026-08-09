import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Search, Eye, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KycRow {
  id: string;
  user_id: string;
  full_name: string;
  nrc_number: string;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  id_front_path: string | null;
  id_back_path: string | null;
  selfie_path: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
  id_type?: string | null;
  guardian_name?: string | null;
  guardian_id_number?: string | null;
  guardian_phone?: string | null;
  guardian_relationship?: string | null;
}

export function KYCManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KycRow | null>(null);
  const [notes, setNotes] = useState("");
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_verifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as KycRow[];
    },
    refetchInterval: 20000,
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { data, error } = await supabase.rpc("admin_review_kyc" as never, {
        p_payload: { kyc_id: id, status, notes: notes || null },
      } as never);
      if (error) throw error;
      const res = data as unknown as { success: boolean; message?: string };
      if (!res?.success) throw new Error(res?.message || "Review failed");
      return res;
    },
    onSuccess: (_d, v) => {
      toast({ title: `Verification ${v.status}` });
      queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
      setSelected(null);
      setNotes("");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const openRow = async (row: KycRow) => {
    setSelected(row);
    setNotes(row.review_notes || "");
    const paths = [row.id_front_path, row.id_back_path, row.selfie_path].filter(Boolean) as string[];
    const urls: Record<string, string> = {};
    await Promise.all(
      paths.map(async (p) => {
        const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(p, 600);
        if (data?.signedUrl) urls[p] = data.signedUrl;
      })
    );
    setDocUrls(urls);
  };

  const filtered = (rows || []).filter((r) => {
    const matchTab = tab === "all" || r.status === tab;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || `${r.full_name} ${r.nrc_number} ${r.city}`.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const counts = {
    pending: (rows || []).filter((r) => r.status === "pending").length,
    approved: (rows || []).filter((r) => r.status === "approved").length,
    rejected: (rows || []).filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(["pending", "approved", "rejected"] as const).map((k) => (
          <Card key={k} className="rounded-2xl">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{counts[k]}</p>
              <p className="text-xs text-muted-foreground capitalize">{k}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> KYC Verifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, NRC, city…" className="pl-9" />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No submissions here.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.nrc_number} · {r.city || "—"} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="capitalize shrink-0">
                    {r.status}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => openRow(r)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Review verification</DialogTitle>
            <DialogDescription>Confirm the documents match the submitted details before approving.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{selected.full_name}</p></div>
                <div><p className="text-xs text-muted-foreground">NRC</p><p className="font-medium">{selected.nrc_number}</p></div>
                <div><p className="text-xs text-muted-foreground">DOB</p><p className="font-medium">{selected.date_of_birth || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">City</p><p className="font-medium">{selected.city || "—"}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{selected.address || "—"}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Document type</p><p className="font-medium capitalize">{(selected.id_type || "nrc").replace(/_/g, " ")}</p></div>
              </div>

              {selected.guardian_name && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1">
                  <p className="text-xs font-semibold text-primary">Guardian-assisted (minor, no NRC)</p>
                  <p className="text-sm font-medium">{selected.guardian_name} · {selected.guardian_relationship || "Guardian"}</p>
                  <p className="text-xs text-muted-foreground">NRC {selected.guardian_id_number || "—"} · {selected.guardian_phone || "—"}</p>
                </div>
              )}


              <div className="grid grid-cols-3 gap-2">
                {[selected.id_front_path, selected.id_back_path, selected.selfie_path].map((p, i) =>
                  p && docUrls[p] ? (
                    <a key={i} href={docUrls[p]} target="_blank" rel="noreferrer" className="block">
                      <img src={docUrls[p]} alt={["NRC front", "NRC back", "Selfie"][i]} className="w-full h-20 object-cover rounded-lg border border-border" />
                    </a>
                  ) : (
                    <div key={i} className="h-20 rounded-lg border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">
                      {["Front", "Back", "Selfie"][i]}
                    </div>
                  )
                )}
              </div>

              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review notes (shown to the user)" rows={2} />

              <div className="grid grid-cols-2 gap-2">
                <Button variant="destructive" disabled={review.isPending}
                  onClick={() => review.mutate({ id: selected.id, status: "rejected" })}>
                  {review.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4 mr-1" /> Reject</>}
                </Button>
                <Button disabled={review.isPending}
                  onClick={() => review.mutate({ id: selected.id, status: "approved" })}>
                  {review.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Approve</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
