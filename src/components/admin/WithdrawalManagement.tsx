import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle2, XCircle, Clock, Phone, User, 
  DollarSign, ChevronDown, ChevronUp, Copy, Loader2,
  AlertCircle, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  provider: string;
  phone_number: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  fee: number;
  net_amount: number;
  admin_notes?: string | null;
}

interface WithdrawalManagementProps {
  withdrawals: Withdrawal[];
}

const getProviderName = (provider: string) => {
  switch (provider) {
    case 'airtel': return 'Airtel Money';
    case 'mtn': return 'MTN Mobile Money';
    case 'zamtel': return 'Zamtel Kwacha';
    default: return provider;
  }
};

const getProviderColor = (provider: string) => {
  switch (provider) {
    case 'airtel': return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'mtn': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'zamtel': return 'bg-green-500/10 text-green-600 border-green-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { 
        icon: Clock, 
        label: 'Pending Review', 
        color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      };
    case 'approved':
      return { 
        icon: Loader2, 
        label: 'Processing', 
        color: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      };
    case 'completed':
      return { 
        icon: CheckCircle2, 
        label: 'Completed', 
        color: 'bg-green-500/10 text-green-600 border-green-500/20'
      };
    case 'rejected':
      return { 
        icon: XCircle, 
        label: 'Rejected', 
        color: 'bg-red-500/10 text-red-600 border-red-500/20'
      };
    default:
      return { 
        icon: AlertCircle, 
        label: status, 
        color: 'bg-muted text-muted-foreground'
      };
  }
};

export function WithdrawalManagement({ withdrawals }: WithdrawalManagementProps) {
  const queryClient = useQueryClient();
  const [expandedWithdrawal, setExpandedWithdrawal] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch user details for each withdrawal
  const userIds = [...new Set(withdrawals.map(w => w.user_id))];
  const { data: usersMap = {} } = useQuery({
    queryKey: ['admin-withdrawal-users', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .in('id', userIds);
      
      if (error) throw error;
      
      const map: Record<string, { full_name: string | null; email: string; phone: string | null }> = {};
      data.forEach(user => {
        map[user.id] = { full_name: user.full_name, email: user.email, phone: user.phone };
      });
      return map;
    },
    enabled: userIds.length > 0,
  });

  // Update withdrawal mutation
  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ withdrawalId, status, notes }: { withdrawalId: string; status: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('admin_update_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_status: status,
        p_admin_notes: notes || null,
      });
      
      if (error) throw error;
      return { result: data as any, withdrawalId, status, notes };
    },
    onSuccess: ({ result, withdrawalId, status, notes }) => {
      if (result?.success) {
        toast.success(result.message);
        const w = withdrawals.find((x) => x.id === withdrawalId);
        const u = w ? usersMap[w.user_id] : null;
        if (w && u?.email) {
          supabase.functions.invoke('send-email', {
            body: {
              template: 'withdrawal_status',
              to: u.email,
              data: {
                status,
                amount: w.amount,
                kwacha: Math.round((w.net_amount / 150) * 10),
                provider: w.provider,
                phone: w.phone_number,
                notes,
              },
            },
          }).catch((e) => console.warn('email send failed', e));
        }
        queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        setRejectDialogOpen(false);
        setSelectedWithdrawal(null);
        setRejectReason('');
      } else {
        toast.error(result?.message || 'Failed to update withdrawal');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleReject = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedWithdrawal) {
      updateWithdrawalMutation.mutate({
        withdrawalId: selectedWithdrawal.id,
        status: 'rejected',
        notes: rejectReason || 'Rejected by admin'
      });
    }
  };

  // Filter withdrawals by status
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved');
  const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');
  const rejectedWithdrawals = withdrawals.filter(w => w.status === 'rejected');

  // Calculate totals
  const pendingTotal = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const approvedTotal = approvedWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  const WithdrawalCard = ({ withdrawal }: { withdrawal: Withdrawal }) => {
    const user = usersMap[withdrawal.user_id];
    const status = getStatusConfig(withdrawal.status);
    const StatusIcon = status.icon;
    const isExpanded = expandedWithdrawal === withdrawal.id;

    return (
      <Card className="overflow-hidden">
        <Collapsible 
          open={isExpanded}
          onOpenChange={(open) => setExpandedWithdrawal(open ? withdrawal.id : null)}
        >
          <CardContent className="p-4">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-lg">{withdrawal.amount.toLocaleString()} pts</span>
                  <Badge className={status.color}>
                    <StatusIcon className={`w-3 h-3 mr-1 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
                    {status.label}
                  </Badge>
                </div>
                
                {/* User Info */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="w-3 h-3" />
                  <span>{user?.full_name || user?.email || 'Unknown User'}</span>
                </div>
                
                {/* Provider and Phone */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={getProviderColor(withdrawal.provider)}>
                    {getProviderName(withdrawal.provider)}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono">{withdrawal.phone_number}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(withdrawal.phone_number)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            {/* Expanded Details */}
            <CollapsibleContent className="pt-4 mt-4 border-t space-y-4">
              {/* Financial Details */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="font-semibold">{withdrawal.amount.toLocaleString()} pts</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground text-xs">Fee (10%)</p>
                  <p className="font-semibold text-destructive">-{withdrawal.fee.toLocaleString()} pts</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground text-xs">Net Amount</p>
                  <p className="font-semibold text-green-600">{withdrawal.net_amount.toLocaleString()} pts</p>
                </div>
              </div>

              {/* User Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User Phone:</span>
                  <span className="font-medium">{user?.phone || 'Not verified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested:</span>
                  <span className="font-medium">{format(new Date(withdrawal.created_at), 'MMM d, yyyy • h:mm a')}</span>
                </div>
                {withdrawal.processed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processed:</span>
                    <span className="font-medium">{format(new Date(withdrawal.processed_at), 'MMM d, yyyy • h:mm a')}</span>
                  </div>
                )}
                {withdrawal.admin_notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Admin Notes:</span>
                    <p className="mt-1 text-sm bg-muted/50 p-2 rounded">{withdrawal.admin_notes}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {withdrawal.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 gap-1"
                    onClick={() => updateWithdrawalMutation.mutate({
                      withdrawalId: withdrawal.id,
                      status: 'approved'
                    })}
                    disabled={updateWithdrawalMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Mark as Paid
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-1"
                    onClick={() => handleReject(withdrawal)}
                    disabled={updateWithdrawalMutation.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              )}

              {withdrawal.status === 'approved' && (
                <Button
                  className="w-full gap-1"
                  onClick={() => updateWithdrawalMutation.mutate({
                    withdrawalId: withdrawal.id,
                    status: 'completed'
                  })}
                  disabled={updateWithdrawalMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Completed
                </Button>
              )}
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-lg font-bold">{pendingWithdrawals.length}</p>
                <p className="text-xs text-muted-foreground">Pending ({pendingTotal.toLocaleString()} pts)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-lg font-bold">{approvedWithdrawals.length}</p>
                <p className="text-xs text-muted-foreground">Processing ({approvedTotal.toLocaleString()} pts)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingWithdrawals.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-yellow-500">{pendingWithdrawals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Processing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingWithdrawals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No pending withdrawal requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingWithdrawals.map(w => <WithdrawalCard key={w.id} withdrawal={w} />)
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approvedWithdrawals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No withdrawals being processed</p>
              </CardContent>
            </Card>
          ) : (
            approvedWithdrawals.map(w => <WithdrawalCard key={w.id} withdrawal={w} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completedWithdrawals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No completed withdrawals yet</p>
              </CardContent>
            </Card>
          ) : (
            completedWithdrawals.slice(0, 20).map(w => <WithdrawalCard key={w.id} withdrawal={w} />)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejectedWithdrawals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <XCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No rejected withdrawals</p>
              </CardContent>
            </Card>
          ) : (
            rejectedWithdrawals.slice(0, 20).map(w => <WithdrawalCard key={w.id} withdrawal={w} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this withdrawal request. The user will be notified and their points will be refunded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Invalid phone number, Suspicious activity, etc."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRejectDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmReject}
                disabled={updateWithdrawalMutation.isPending}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
