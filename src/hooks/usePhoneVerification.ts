import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UsePhoneVerificationReturn {
  sendOtp: (phoneNumber: string, userId?: string) => Promise<boolean>;
  verifyOtp: (phoneNumber: string, otpCode: string, userId?: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export const usePhoneVerification = (): UsePhoneVerificationReturn => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = useCallback(async (phoneNumber: string, userId?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone_number: phoneNumber, user_id: userId },
        headers: { "Content-Type": "application/json" },
      });

      if (funcError) {
        throw new Error(funcError.message || "Failed to send verification code");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Code sent!",
        description: "Check your phone for the verification code.",
      });

      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send verification code";
      setError(errorMessage);
      toast({
        title: "Failed to send code",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const verifyOtp = useCallback(async (
    phoneNumber: string, 
    otpCode: string, 
    userId?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone_number: phoneNumber, otp_code: otpCode, user_id: userId },
        headers: { "Content-Type": "application/json" },
      });

      if (funcError) {
        throw new Error(funcError.message || "Verification failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Phone verified!",
        description: "Your phone number has been verified successfully.",
      });

      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Verification failed";
      setError(errorMessage);
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    sendOtp,
    verifyOtp,
    isLoading,
    error,
  };
};
