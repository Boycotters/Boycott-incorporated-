import { useState } from "react";
import { Phone, Shield, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";

interface PhoneVerificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onVerified: () => void;
}

export function PhoneVerificationSheet({ 
  open, 
  onOpenChange, 
  userId,
  onVerified 
}: PhoneVerificationSheetProps) {
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  const { sendOtp, verifyOtp, isLoading } = usePhoneVerification();

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) return;
    
    const success = await sendOtp(phoneNumber, userId);
    if (success) {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    
    const success = await verifyOtp(phoneNumber, otpCode, userId);
    if (success) {
      setStep('success');
      setTimeout(() => {
        onVerified();
        onOpenChange(false);
        // Reset state
        setStep('phone');
        setPhoneNumber("");
        setOtpCode("");
      }, 1500);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {step === 'success' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <Phone className="w-8 h-8 text-primary" />
            )}
          </div>
          <SheetTitle>
            {step === 'phone' && 'Verify Phone Number'}
            {step === 'otp' && 'Enter Verification Code'}
            {step === 'success' && 'Phone Verified!'}
          </SheetTitle>
          <SheetDescription>
            {step === 'phone' && 'We\'ll send a code to verify your number for withdrawals'}
            {step === 'otp' && `Enter the 6-digit code sent to ${phoneNumber}`}
            {step === 'success' && 'Your phone number has been verified successfully'}
          </SheetDescription>
        </SheetHeader>

        {step === 'phone' && (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09X XXX XXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                className="h-12 rounded-xl text-base text-center tracking-widest"
                maxLength={12}
              />
            </div>
            <Button 
              onClick={handleSendOtp} 
              className="w-full h-12 rounded-xl"
              disabled={phoneNumber.length < 10 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-6 pt-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
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
              className="w-full h-12 rounded-xl"
              disabled={otpCode.length !== 6 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => {
                setStep('phone');
                setOtpCode("");
              }}
            >
              Change phone number
            </Button>
          </div>
        )}

        {step === 'success' && (
          <div className="flex justify-center pt-4">
            <div className="text-center text-green-600">
              <p className="font-medium">Redirecting...</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
