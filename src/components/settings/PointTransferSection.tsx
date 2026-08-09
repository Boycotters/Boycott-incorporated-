import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Coins, Loader2, ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function PointTransferSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showTransfer, setShowTransfer] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: wallet } = useQuery({
    queryKey: ["wallet-transfer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("available_points")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["my-transfers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("point_transfers")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const participantIds = useMemo(
    () => [...new Set(transfers.flatMap((transfer: any) => [transfer.sender_id, transfer.recipient_id]).filter(Boolean))],
    [transfers]
  );

  const { data: transferUsers = [] } = useQuery({
    queryKey: ["transfer-users", participantIds.join(",")],
    queryFn: async () => {
      if (participantIds.length === 0) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", participantIds);

      if (error) throw error;
      return data;
    },
    enabled: participantIds.length > 0,
  });

  const usersById = useMemo(
    () => new Map(transferUsers.map((transferUser: any) => [transferUser.id, transferUser])),
    [transferUsers]
  );

  const getUserLabel = (userId?: string) => {
    if (!userId) return "Unknown user";
    const matchedUser = usersById.get(userId);
    return matchedUser?.full_name || matchedUser?.email || "Unknown user";
  };

  const transferMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("initiate_point_transfer", {
        p_sender_id: user?.id!,
        p_recipient_email: recipientEmail.trim(),
        p_amount: parseInt(amount),
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      if (result.success) {
        setLastResult(result);
        toast.success(result.message);
        // Email sender + recipient + admin
        const amt = parseInt(amount || "0");
        const senderLabel = user?.email || "A user";
        if (user?.email) {
          supabase.functions.invoke("send-email", {
            body: { template: "transfer_created", to: user.email, data: { role: "sender", amount: amt, counterparty: recipientEmail } },
          }).catch(() => {});
        }
        supabase.functions.invoke("send-email", {
          body: { template: "transfer_created", to: recipientEmail, data: { role: "recipient", amount: amt, counterparty: senderLabel } },
        }).catch(() => {});
        supabase.functions.invoke("send-email", {
          body: { template: "admin_alert", data: { title: "Transfer pending review", message: `${senderLabel} → ${recipientEmail}: ${amt} pts` } },
        }).catch(() => {});
        setRecipientEmail("");
        setAmount("");
        queryClient.invalidateQueries({ queryKey: ["wallet-transfer"] });
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["my-transfers"] });
        queryClient.invalidateQueries({ queryKey: ["admin-transfers"] });
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const fee = amount ? Math.max(10, Math.ceil(parseInt(amount || "0") * 0.05)) : 0;
  const total = (parseInt(amount || "0") || 0) + fee;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600"><Clock className="w-3 h-3" />Pending</Badge>;
      case "approved":
        return <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-600"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
    <KycBanner action="transfer points" compact />
    <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-secondary p-2 rounded-xl">
          <Send className="w-5 h-5 text-secondary-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Send Points</h3>
        <Badge variant="secondary" className="ml-auto gap-1">
          <Coins className="w-3 h-3" />
          {wallet?.available_points || 0}
        </Badge>
      </div>

      <Button
        className="w-full rounded-xl gap-2 mb-3"
        onClick={() => { setShowTransfer(true); setLastResult(null); }}
      >
        <Send className="w-4 h-4" />
        Send Points to User
      </Button>

      <p className="text-xs text-muted-foreground mb-3">
        Transfers appear here instantly and reach the recipient after admin approval.
      </p>

      {/* Recent transfers */}
      {transfers.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground">Recent Transfers</p>
          {transfers.map((t: any) => {
            const isSender = t.sender_id === user?.id;
            return (
              <div key={t.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <ArrowRight className={`w-3 h-3 shrink-0 ${isSender ? "text-red-500" : "text-green-500 rotate-180"}`} />
                  <div className="min-w-0">
                    <p className="text-sm truncate">
                      {isSender
                        ? `To: ${getUserLabel(t.recipient_id)}`
                        : `From: ${getUserLabel(t.sender_id)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Code: {t.verification_code}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-sm font-medium ${isSender ? "text-red-500" : "text-green-500"}`}>
                    {isSender ? "-" : "+"}{t.amount}
                  </span>
                  {getStatusBadge(t.status)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Points</DialogTitle>
            <DialogDescription>
              Transfer points to another user. A 5% fee (min 10 pts) applies. Transfers require admin approval.
            </DialogDescription>
          </DialogHeader>

          {lastResult?.success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-lg">Transfer Initiated!</p>
                <p className="text-sm text-muted-foreground">Awaiting admin approval before the recipient receives the points</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-sm">Recipient: <span className="font-medium">{lastResult.recipient_name}</span></p>
                <p className="text-sm">Amount: <span className="font-medium">{lastResult.amount} pts</span></p>
                <p className="text-sm">Fee: <span className="font-medium">{lastResult.fee} pts</span></p>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Verification Code</p>
                  <p className="text-2xl font-bold font-mono tracking-widest">{lastResult.verification_code}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Share this code with the recipient for reference. Admins can review it in the Transfers tab.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Recipient Email</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (min 50)</Label>
                <Input
                  type="number"
                  placeholder="Enter points to send"
                  min={50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {amount && parseInt(amount) >= 50 && (
                <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span>{amount} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee (5%)</span>
                    <span>{fee} pts</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-border pt-1">
                    <span>Total</span>
                    <span>{total} pts</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full rounded-xl gap-2"
                onClick={() => transferMutation.mutate()}
                disabled={
                  transferMutation.isPending ||
                  !recipientEmail.trim() ||
                  !amount ||
                  parseInt(amount) < 50
                }
              >
                {transferMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send {amount || 0} Points
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}
