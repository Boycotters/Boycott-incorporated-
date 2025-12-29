import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  provider: string;
  phone_number: string;
  status: string;
  created_at: string;
  processed_at: string | null;
}

interface WithdrawalHistoryProps {
  withdrawals: Withdrawal[];
  isLoading: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { 
        icon: Clock, 
        label: 'Pending', 
        variant: 'secondary' as const,
        color: 'text-yellow-600'
      };
    case 'approved':
      return { 
        icon: Loader2, 
        label: 'Processing', 
        variant: 'secondary' as const,
        color: 'text-blue-600'
      };
    case 'completed':
      return { 
        icon: CheckCircle2, 
        label: 'Completed', 
        variant: 'default' as const,
        color: 'text-green-600'
      };
    case 'rejected':
      return { 
        icon: XCircle, 
        label: 'Rejected', 
        variant: 'destructive' as const,
        color: 'text-destructive'
      };
    default:
      return { 
        icon: Clock, 
        label: status, 
        variant: 'secondary' as const,
        color: 'text-muted-foreground'
      };
  }
};

const getProviderName = (provider: string) => {
  switch (provider) {
    case 'airtel': return 'Airtel Money';
    case 'mtn': return 'MTN Money';
    case 'zamtel': return 'Zamtel Kwacha';
    default: return provider;
  }
};

export function WithdrawalHistory({ withdrawals, isLoading }: WithdrawalHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <Card className="p-6 text-center rounded-xl">
        <p className="text-muted-foreground text-sm">No withdrawal history yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {withdrawals.map((withdrawal) => {
        const status = getStatusConfig(withdrawal.status);
        const StatusIcon = status.icon;
        
        return (
          <Card key={withdrawal.id} className="p-4 rounded-xl">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {withdrawal.net_amount.toLocaleString()} pts
                  </span>
                  <Badge variant={status.variant} className="text-xs">
                    <StatusIcon className={`w-3 h-3 mr-1 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getProviderName(withdrawal.provider)} • {withdrawal.phone_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(withdrawal.created_at), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Fee</p>
                <p className="text-sm font-medium text-destructive">
                  -{withdrawal.fee.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
