import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrCode, ScanLine, X, Copy, CheckCircle2, Coins } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRPaymentSectionProps {
  userId?: string;
}

export function QRPaymentSection({ userId }: QRPaymentSectionProps) {
  const { user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";

  const { data: userData } = useQuery({
    queryKey: ["user-qr-data", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("users")
        .select("email, full_name, referral_code")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet-qr", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("available_points")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // QR data format: boycott://pay?email=X&name=Y&amount=Z
  const qrPayload = JSON.stringify({
    type: "boycott_pay",
    email: userData?.email,
    name: userData?.full_name,
    userId: userId,
    amount: paymentAmount ? parseInt(paymentAmount) : undefined,
  });

  const startScanner = async () => {
    setShowScanner(true);
    setScanResult(null);

    // Wait for DOM
    await new Promise((r) => setTimeout(r, 300));

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.type === "boycott_pay") {
              setScanResult(decodedText);
              toast.success(`Scanned: ${data.name || data.email}`);
              html5QrCode.stop().catch(() => {});
            } else {
              toast.info("Not a valid Boycott payment QR code");
            }
          } catch {
            toast.info("Not a valid QR code format");
          }
        },
        () => {} // ignore scan errors
      );
    } catch (err) {
      toast.error("Could not access camera. Please allow camera permissions.");
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setShowScanner(false);
    setScanResult(null);
  };

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const copyQRData = () => {
    navigator.clipboard.writeText(userData?.email || "");
    toast.success("Email copied to clipboard");
  };

  return (
    <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-secondary p-2 rounded-xl">
          <QrCode className="w-5 h-5 text-secondary-foreground" />
        </div>
        <h3 className="font-semibold text-lg">QR Payments</h3>
        <Badge variant="secondary" className="ml-auto gap-1">
          <Coins className="w-3 h-3" />
          {wallet?.available_points || 0} pts
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="rounded-xl h-auto py-4 flex flex-col gap-2"
          onClick={() => setShowMyQR(true)}
        >
          <QrCode className="w-8 h-8" />
          <span className="text-xs">My QR Code</span>
        </Button>
        <Button
          variant="outline"
          className="rounded-xl h-auto py-4 flex flex-col gap-2"
          onClick={startScanner}
        >
          <ScanLine className="w-8 h-8" />
          <span className="text-xs">Scan to Pay</span>
        </Button>
      </div>

      {/* My QR Code Dialog */}
      <Dialog open={showMyQR} onOpenChange={setShowMyQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>My Payment QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="space-y-2 w-full">
              <Label>Amount (optional)</Label>
              <Input
                type="number"
                placeholder="Enter amount in points"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={qrPayload} size={200} />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">{userData?.full_name || "User"}</p>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
              {paymentAmount && (
                <Badge className="gap-1">
                  <Coins className="w-3 h-3" />
                  {paymentAmount} pts
                </Badge>
              )}
            </div>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={copyQRData}>
              <Copy className="w-4 h-4" />
              Copy Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!scanResult ? (
              <div id={scannerContainerId} className="rounded-xl overflow-hidden" />
            ) : (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-medium">QR Code Scanned!</p>
                {(() => {
                  try {
                    const data = JSON.parse(scanResult);
                    return (
                      <div className="space-y-1">
                        <p className="text-sm">{data.name || "User"}</p>
                        <p className="text-xs text-muted-foreground">{data.email}</p>
                        {data.amount && (
                          <Badge className="gap-1">
                            <Coins className="w-3 h-3" />
                            {data.amount} pts requested
                          </Badge>
                        )}
                      </div>
                    );
                  } catch {
                    return <p className="text-sm text-muted-foreground">{scanResult}</p>;
                  }
                })()}
                <p className="text-xs text-muted-foreground">
                  Use the "Send Points" feature to complete payment.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
