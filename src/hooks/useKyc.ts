import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type KycStatus = "none" | "pending" | "approved" | "rejected";

export interface KycRecord {
  id: string;
  full_name: string;
  nrc_number: string;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  status: KycStatus;
  review_notes: string | null;
  created_at: string;
}

export function useKyc() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_verifications")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as KycRecord) || null;
    },
    enabled: !!user?.id,
  });

  const status: KycStatus = (data?.status as KycStatus) || "none";

  return {
    kyc: data || null,
    status,
    isApproved: status === "approved",
    isPending: status === "pending",
    isRejected: status === "rejected",
    isLoading,
    refetch,
  };
}
