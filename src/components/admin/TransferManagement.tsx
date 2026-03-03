import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Clock, Send, Coins, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TransferManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [reviewTransfer, setReviewTransfer] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["admin-transfers", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_transfers")
        .select("*, sender:sender_id(full_name, email), recipient:recipient_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ transferId, action }: { transferId: string; action: string }) => {
      const { data, error } = await supabase.rpc("admin_review_transfer", {
        p_transfer_id: transferId,
        p_action: action,
        p_admin_notes: adminNotes || null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        setReviewTransfer(null);
        setAdminNotes("");
        queryClient.invalidateQueries({ queryKey: ["admin-transfers"] });
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = transfers.filter((t: any) => t.status === "pending");
  const completed = transfers.filter((t: any) => t.status !== "pending");

  const filteredTransfers = search
    ? transfers.filter((t: any) => {
        const s = search.toLowerCase();
        return (
          (t.sender as any)?.email?.toLowerCase().includes(s) ||
          (t.sender as any)?.full_name?.toLowerCase().includes(s) ||
          (t.recipient as any)?.email?.toLowerCase().includes(s) ||
          (t.recipient as any)?.full_name?.toLowerCase().includes(s) ||
          t.verification_code?.includes(s)
        );
      })
    : transfers;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 gap-1"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Point Transfers
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pending.length} pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredTransfers.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => { setReviewTransfer(t); setAdminNotes(t.admin_notes || ""); }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{t.amount} pts</span>
                      <span className="text-xs text-muted-foreground">+ {t.fee} fee</span>
                    </div>
                    {getStatusBadge(t.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">From: </span>
                      <span className="font-medium">{(t.sender as any)?.full_name || (t.sender as any)?.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To: </span>
                      <span className="font-medium">{(t.recipient as any)?.full_name || (t.recipient as any)?.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>Code: <span className="font-mono font-medium">{t.verification_code}</span></span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {filteredTransfers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No transfers found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewTransfer} onOpenChange={(open) => !open && setReviewTransfer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Transfer</DialogTitle>
          </DialogHeader>
          {reviewTransfer && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">From</span>
                  <span className="text-sm font-medium">{(reviewTransfer.sender as any)?.full_name || (reviewTransfer.sender as any)?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">To</span>
                  <span className="text-sm font-medium">{(reviewTransfer.recipient as any)?.full_name || (reviewTransfer.recipient as any)?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm font-medium">{reviewTransfer.amount} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fee</span>
                  <span className="text-sm font-medium">{reviewTransfer.fee} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Code</span>
                  <span className="text-sm font-mono font-bold">{reviewTransfer.verification_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(reviewTransfer.status)}
                </div>
              </div>

              {reviewTransfer.status === "pending" && (
                <>
                  <Textarea
                    placeholder="Admin notes (optional)"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() => reviewMutation.mutate({ transferId: reviewTransfer.id, action: "approve" })}
                      disabled={reviewMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2"
                      onClick={() => reviewMutation.mutate({ transferId: reviewTransfer.id, action: "reject" })}
                      disabled={reviewMutation.isPending}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
