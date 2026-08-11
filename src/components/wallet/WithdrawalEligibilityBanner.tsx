import { useState } from "react";
import { Users, Phone, Shield, ChevronDown, ChevronUp, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useKyc } from "@/hooks/useKyc";
import { KycDialog } from "@/components/kyc";

interface WithdrawalEligibilityBannerProps {
  referralCount: number;
  requiredReferrals: number;
  isPhoneVerified: boolean;
  onVerifyPhone: () => void;
}

export function WithdrawalEligibilityBanner({
  referralCount,
  requiredReferrals,
  isPhoneVerified,
  onVerifyPhone,
}: WithdrawalEligibilityBannerProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [kycOpen, setKycOpen] = useState(false);
  const { status: kycStatus, isLoading: kycLoading } = useKyc();

  const hasEnoughReferrals = referralCount >= requiredReferrals;
  const kycApproved = kycStatus === "approved";
  const isFullyEligible = hasEnoughReferrals && isPhoneVerified && kycApproved;

  if (kycLoading || isFullyEligible) {
    return null;
  }

  const pendingRequirements = [];
  if (!hasEnoughReferrals) {
    pendingRequirements.push({
      icon: Users,
      label: `Invite ${requiredReferrals - referralCount} more friend${requiredReferrals - referralCount !== 1 ? 's' : ''}`,
      action: () => navigate('/referrals'),
      actionLabel: 'Invite',
      progress: `${referralCount}/${requiredReferrals}`,
    });
  }
  if (!isPhoneVerified) {
    pendingRequirements.push({
      icon: Phone,
      label: 'Verify your phone number',
      action: onVerifyPhone,
      actionLabel: 'Verify',
      progress: null,
    });
  }
  if (!kycApproved) {
    pendingRequirements.push({
      icon: kycStatus === "pending" ? Clock : ShieldCheck,
      label:
        kycStatus === "pending"
          ? "Identity verification under review"
          : kycStatus === "rejected"
            ? "Identity verification rejected — resubmit"
            : "Verify your identity (KYC)",
      action: () => setKycOpen(true),
      actionLabel:
        kycStatus === "pending" ? "View" : kycStatus === "rejected" ? "Resubmit" : "Verify",
      progress: null,
    });
  }


  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-700 dark:text-amber-400">
              First Withdrawal Requirements
            </h3>
            <p className="text-xs text-muted-foreground">
              Complete {pendingRequirements.length} requirement{pendingRequirements.length !== 1 ? 's' : ''} to unlock
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {pendingRequirements.map((req, idx) => {
            const Icon = req.icon;
            return (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-background rounded-xl p-3 border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{req.label}</p>
                    {req.progress && (
                      <p className="text-xs text-muted-foreground">Progress: {req.progress}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={req.action}>
                  {req.actionLabel}
                </Button>
              </div>
            );
          })}
          
          <p className="text-xs text-center text-muted-foreground pt-1">
            You can still prepare your withdrawal details below
          </p>
        </div>
      )}
      <KycDialog open={kycOpen} onOpenChange={setKycOpen} />
    </div>
  );
}
