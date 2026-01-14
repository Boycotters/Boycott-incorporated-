import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, ArrowRight, Loader2, Check, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhoneVerificationProps {
  userId?: string;
  onVerified: (phoneNumber: string) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export const PhoneVerification = ({ 
  userId, 
  onVerified, 
  onSkip,
  showSkip = true 
}: PhoneVerificationProps) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, "");
    return cleaned;
  };

  const validatePhone = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length < 10) {
      return "Phone number must be at least 10 digits";
    }
    if (cleaned.length > 15) {
      return "Phone number is too long";
    }
    return null;
  };

  const handleSendOtp = async () => {
    setPhoneError(null);
    
    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone_number: phone, user_id: userId },
        headers: { "Content-Type": "application/json" },
      });

      // Handle edge function errors
      if (error) {
        throw new Error(error.message || "Failed to send verification code");
      }

      // Check for application-level errors in response
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Code sent!",
        description: "Check your phone for the verification code.",
      });
      
      setStep("otp");
      setCountdown(60);
    } catch (err: any) {
      toast({
        title: "Failed to send code",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-sms-otp", {
        body: { phone_number: phone, otp_code: otp, user_id: userId },
        headers: { "Content-Type": "application/json" },
      });

      if (error) {
        throw new Error(error.message || "Verification failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Phone verified!",
        description: "Your phone number has been verified successfully.",
      });
      
      onVerified(phone);
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setOtp("");
    handleSendOtp();
  };

  if (step === "otp") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Phone className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Enter verification code</h3>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to {phone}
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button 
          onClick={handleVerifyOtp} 
          className="w-full" 
          disabled={isLoading || otp.length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Verify
            </>
          )}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep("phone");
              setOtp("");
            }}
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Change number
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isLoading || countdown > 0}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Phone className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Verify your phone</h3>
        <p className="text-sm text-muted-foreground">
          We'll send you a verification code via SMS
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+260 XXX XXX XXX"
          value={phone}
          onChange={(e) => {
            setPhone(formatPhoneNumber(e.target.value));
            setPhoneError(null);
          }}
          className={phoneError ? "border-destructive" : ""}
          disabled={isLoading}
        />
        {phoneError && (
          <p className="text-sm text-destructive">{phoneError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Include country code (e.g., +260 for Zambia)
        </p>
      </div>

      <Button 
        onClick={handleSendOtp} 
        className="w-full" 
        disabled={isLoading || !phone}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending code...
          </>
        ) : (
          <>
            Send verification code
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      {showSkip && onSkip && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onSkip}
          disabled={isLoading}
        >
          Skip for now
        </Button>
      )}
    </div>
  );
};
