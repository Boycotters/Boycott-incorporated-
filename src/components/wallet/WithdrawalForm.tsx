import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Smartphone, AlertCircle, Check, Users, Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WithdrawalEligibility {
  eligible: boolean;
  reason?: string;
  message: string;
  referral_count?: number;
  required_referrals?: number;
  remaining_referrals?: number;
  is_verified?: boolean;
}

interface WithdrawalFormProps {
  availablePoints: number;
  onSubmit: (data: { amount: number; provider: string; phoneNumber: string }) => Promise<void>;
  isSubmitting: boolean;
  eligibility?: WithdrawalEligibility | null;
}

const PROVIDERS = [
  { id: 'airtel', name: 'Airtel Money', color: 'bg-red-500' },
  { id: 'mtn', name: 'MTN Money', color: 'bg-yellow-500' },
  { id: 'zamtel', name: 'Zamtel Kwacha', color: 'bg-green-500' },
];

const MIN_WITHDRAWAL = 500;
const FEE_PERCENTAGE = 0.10;

export function WithdrawalForm({ availablePoints, onSubmit, isSubmitting, eligibility }: WithdrawalFormProps) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const amountNum = parseInt(amount) || 0;
  const fee = useMemo(() => Math.ceil(amountNum * FEE_PERCENTAGE), [amountNum]);
  const netAmount = amountNum - fee;

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (amountNum > 0 && amountNum < MIN_WITHDRAWAL) {
      errs.push(`Minimum withdrawal is ${MIN_WITHDRAWAL} points`);
    }
    if (amountNum > availablePoints) {
      errs.push("Insufficient balance");
    }
    return errs;
  }, [amountNum, availablePoints]);

  const isValid = amountNum >= MIN_WITHDRAWAL && 
                  amountNum <= availablePoints && 
                  provider && 
                  phoneNumber.length >= 10 &&
                  (eligibility?.eligible !== false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    await onSubmit({ amount: amountNum, provider, phoneNumber });
  };

  const quickAmounts = [500, 1000, 2000, 5000];

  // Show eligibility requirements if not eligible
  if (eligibility && !eligibility.eligible) {
    return (
      <Card className="p-6 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
            {eligibility.reason === 'email_not_verified' ? (
              <Mail className="w-8 h-8 text-amber-500" />
            ) : (
              <Lock className="w-8 h-8 text-amber-500" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-2">Unlock Withdrawals</h3>
            <p className="text-muted-foreground text-sm">{eligibility.message}</p>
          </div>

          {eligibility.reason === 'insufficient_referrals' && (
            <div className="bg-background rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-semibold">
                  {eligibility.referral_count || 0} / {eligibility.required_referrals || 3} Referrals
                </span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${((eligibility.referral_count || 0) / (eligibility.required_referrals || 3)) * 100}%` }}
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                Invite {eligibility.remaining_referrals} more friend{eligibility.remaining_referrals !== 1 ? 's' : ''} to unlock withdrawals
              </p>
              
              <Button 
                onClick={() => navigate('/referrals')} 
                className="w-full"
              >
                <Users className="w-4 h-4 mr-2" />
                Invite Friends
              </Button>
            </div>
          )}

          {eligibility.reason === 'email_not_verified' && (
            <div className="bg-background rounded-xl p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Check your inbox for the verification email we sent when you signed up.
              </p>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                I've Verified My Email
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Provider Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select Provider</Label>
        <RadioGroup value={provider} onValueChange={setProvider} className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <Label
              key={p.id}
              htmlFor={p.id}
              className={`
                flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all
                ${provider === p.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 bg-card'}
              `}
            >
              <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
              <div className={`w-8 h-8 ${p.color} rounded-full flex items-center justify-center`}>
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-center">{p.name}</span>
              {provider === p.id && (
                <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
              )}
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="09X XXX XXXX"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          className="h-12 rounded-xl text-base"
          maxLength={12}
        />
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium">Amount (Points)</Label>
        <Input
          id="amount"
          type="number"
          placeholder={`Min ${MIN_WITHDRAWAL} points`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-12 rounded-xl text-base"
          min={MIN_WITHDRAWAL}
          max={availablePoints}
        />
        
        {/* Quick amounts */}
        <div className="flex gap-2 flex-wrap">
          {quickAmounts.filter(a => a <= availablePoints).map((a) => (
            <Button
              key={a}
              type="button"
              variant={amountNum === a ? "default" : "outline"}
              size="sm"
              className="rounded-lg text-xs h-7"
              onClick={() => setAmount(a.toString())}
            >
              {a.toLocaleString()}
            </Button>
          ))}
          {availablePoints >= MIN_WITHDRAWAL && (
            <Button
              type="button"
              variant={amountNum === availablePoints ? "default" : "outline"}
              size="sm"
              className="rounded-lg text-xs h-7"
              onClick={() => setAmount(availablePoints.toString())}
            >
              Max
            </Button>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm text-destructive">
            {errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        </div>
      )}

      {/* Fee Breakdown */}
      {amountNum >= MIN_WITHDRAWAL && errors.length === 0 && (
        <Card className="bg-muted/50 p-4 rounded-xl space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Withdrawal Amount</span>
            <span className="font-medium">{amountNum.toLocaleString()} pts</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fee (10%)</span>
            <span className="font-medium text-destructive">-{fee.toLocaleString()} pts</span>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex justify-between">
              <span className="font-medium">You'll Receive</span>
              <span className="font-bold text-primary text-lg">{netAmount.toLocaleString()} pts</span>
            </div>
          </div>
        </Card>
      )}

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-12 rounded-xl font-semibold text-base"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          'Request Withdrawal'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Withdrawals are processed within 24-48 hours
      </p>
    </form>
  );
}