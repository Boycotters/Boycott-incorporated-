import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  LiveWalletCard, 
  WithdrawalForm, 
  WithdrawalHistory, 
  WithdrawalEligibilityBanner,
  PhoneVerificationSheet 
} from "@/components/wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KycBanner } from "@/components/kyc";

interface WithdrawalResult {
  success: boolean;
  message: string;
  error?: string;
  withdrawal_id?: string;
  amount?: number;
  fee?: number;
  net_amount?: number;
  referral_count?: number;
  required_referrals?: number;
}

interface WithdrawalEligibility {
  eligible: boolean;
  reason?: string;
  message: string;
  referral_count?: number;
  required_referrals?: number;
  remaining_referrals?: number;
  is_verified?: boolean;
}

export default function Withdraw() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [phoneVerificationOpen, setPhoneVerificationOpen] = useState(false);

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

  // Fetch user data for phone verification status
  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['user-data-withdrawal', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('phone_verified, phone')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check withdrawal eligibility
  const { data: eligibility, refetch: refetchEligibility } = useQuery({
    queryKey: ['withdrawal-eligibility', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_withdrawal_eligibility', {
        p_user_id: user?.id
      });
      
      if (error) throw error;
      return data as unknown as WithdrawalEligibility;
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
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(result.message);
        // Confirmation email + admin alert (large > 5000 pts)
        if (user?.email) {
          supabase.functions.invoke('send-email', {
            body: {
              template: 'withdrawal_status',
              to: user.email,
              data: { status: 'pending', amount: variables.amount, kwacha: Math.round(variables.amount / 15), provider: variables.provider, phone: variables.phoneNumber },
            },
          }).catch(() => {});
        }
        if (variables.amount >= 5000) {
          supabase.functions.invoke('send-email', {
            body: { template: 'admin_alert', data: { title: 'Large withdrawal request', message: `${user?.email || 'User'} requested ${variables.amount} pts via ${variables.provider}` } },
          }).catch(() => {});
        }
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
        queryClient.invalidateQueries({ queryKey: ['withdrawal-eligibility'] });
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

  const handlePhoneVerified = () => {
    refetchUser();
    refetchEligibility();
    toast.success("Phone verified! You can now withdraw.");
  };

  // Calculate eligibility
  const referralCount = eligibility?.referral_count || 0;
  const requiredReferrals = eligibility?.required_referrals || 2;
  const isPhoneVerified = userData?.phone_verified || false;
  const hasEnoughReferrals = referralCount >= requiredReferrals;
  const isFullyEligible = hasEnoughReferrals && isPhoneVerified;

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
          
          <TabsContent value="withdraw" className="mt-4 space-y-4">
            {/* Identity verification gate */}
            <KycBanner action="cash out" />

            {/* Eligibility Banner - shows only if not eligible */}
            <WithdrawalEligibilityBanner
              referralCount={referralCount}
              requiredReferrals={requiredReferrals}
              isPhoneVerified={isPhoneVerified}
              onVerifyPhone={() => setPhoneVerificationOpen(true)}
            />
            
            {/* Always show the form */}
            <WithdrawalForm
              availablePoints={wallet?.available_points || 0}
              onSubmit={handleWithdrawal}
              isSubmitting={withdrawMutation.isPending}
              isEligible={isFullyEligible}
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

      {/* Phone Verification Sheet */}
      <PhoneVerificationSheet
        open={phoneVerificationOpen}
        onOpenChange={setPhoneVerificationOpen}
        userId={user?.id}
        onVerified={handlePhoneVerified}
      />
    </div>
  );
}
