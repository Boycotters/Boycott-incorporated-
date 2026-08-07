import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useKyc } from "@/hooks/useKyc";
import { KycDialog } from "./KycDialog";

interface Props {
  /** Context copy, e.g. "cash out" or "transfer points". */
  action?: string;
  compact?: boolean;
  /** Hide entirely when the user is already approved. */
  hideWhenApproved?: boolean;
}

export function KycBanner({ action = "cash out", compact, hideWhenApproved = true }: Props) {
  const { status, isLoading } = useKyc();
  const [open, setOpen] = useState(false);

  if (isLoading) return null;
  if (status === "approved" && hideWhenApproved) return null;

  const config = {
    none: {
      icon: ShieldQuestion,
      title: "Verify your identity",
      body: `KYC verification is required before you can ${action}. Takes about 2 minutes.`,
      cta: "Start verification",
      tone: "border-primary/30 bg-primary/5 text-primary",
    },
    pending: {
      icon: Clock,
      title: "Verification under review",
      body: "Our team is checking your documents. You'll be notified once approved.",
      cta: "View submission",
      tone: "border-amber-500/30 bg-amber-500/5 text-amber-600",
    },
    rejected: {
      icon: ShieldAlert,
      title: "Verification rejected",
      body: "Something didn't match. Please resubmit your details and documents.",
      cta: "Resubmit",
      tone: "border-destructive/30 bg-destructive/5 text-destructive",
    },
    approved: {
      icon: ShieldCheck,
      title: "Identity verified",
      body: "Your account is fully verified.",
      cta: "View",
      tone: "border-primary/30 bg-primary/5 text-primary",
    },
  }[status];

  const Icon = config.icon;

  return (
    <>
      <Card className={`rounded-2xl border ${config.tone} p-3 flex items-center gap-3`}>
        <Icon className="w-5 h-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{config.title}</p>
          {!compact && <p className="text-xs text-muted-foreground">{config.body}</p>}
        </div>
        <Button size="sm" variant="secondary" className="shrink-0 rounded-xl" onClick={() => setOpen(true)}>
          {config.cta}
        </Button>
      </Card>
      <KycDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
