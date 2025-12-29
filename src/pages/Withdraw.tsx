import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LiveWalletCard, WithdrawalForm, WithdrawalHistory } from "@/components/wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WithdrawalResult {
  success: boolean;
  message: string;
  error?: string;
  withdrawal_id?: string;
  amount?: number;
  fee?: number;
  net_amount?: number;
}

export default function Withdraw() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch wallet data
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('available_points, locked_points')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch withdrawal history
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['withdrawals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; provider: string; phoneNumber: string }) => {
      const { data: result, error } = await supabase.rpc('request_withdrawal', {
        p_user_id: user?.id,
        p_amount: data.amount,
        p_provider: data.provider,
        p_phone_number: data.phoneNumber,
      });
      
      if (error) throw error;
      return result as unknown as WithdrawalResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process withdrawal');
    },
  });

  const handleWithdrawal = async (data: { amount: number; provider: string; phoneNumber: string }) => {
    await withdrawMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      <div className="max-w-md mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Withdraw</h1>
            <p className="text-sm text-muted-foreground">Convert points to mobile money</p>
          </div>
        </div>

        {/* Wallet Card */}
        <LiveWalletCard
          availablePoints={wallet?.available_points || 0}
          lockedPoints={wallet?.locked_points || 0}
          showWithdrawButton={false}
        />

        {/* Tabs */}
        <Tabs defaultValue="withdraw" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl h-11">
            <TabsTrigger value="withdraw" className="rounded-lg">New Withdrawal</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="withdraw" className="mt-4">
            <WithdrawalForm
              availablePoints={wallet?.available_points || 0}
              onSubmit={handleWithdrawal}
              isSubmitting={withdrawMutation.isPending}
            />
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <WithdrawalHistory
              withdrawals={withdrawals}
              isLoading={withdrawalsLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
