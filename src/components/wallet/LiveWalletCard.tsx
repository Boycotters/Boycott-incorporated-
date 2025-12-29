import { Wallet, ArrowUpRight, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface LiveWalletCardProps {
  availablePoints: number;
  lockedPoints?: number;
  showWithdrawButton?: boolean;
}

export function LiveWalletCard({ 
  availablePoints, 
  lockedPoints = 0, 
  showWithdrawButton = true 
}: LiveWalletCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-2xl shadow-lg border-0 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-medium">My Wallet</span>
          </div>
          {showWithdrawButton && (
            <Button
              size="sm"
              className="bg-white text-emerald-700 hover:bg-white/90 font-semibold rounded-xl text-xs h-8 px-3"
              onClick={() => navigate('/withdraw')}
            >
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
              Withdraw
            </Button>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-white/60 text-xs">Available Balance</p>
          <p className="text-white text-3xl font-bold tracking-tight">
            {availablePoints.toLocaleString()}
            <span className="text-lg font-normal text-white/70 ml-1">pts</span>
          </p>
        </div>
        
        {lockedPoints > 0 && (
          <div className="flex items-center gap-1.5 mt-3 bg-white/10 rounded-lg px-2.5 py-1.5 w-fit">
            <Lock className="w-3 h-3 text-white/70" />
            <span className="text-white/70 text-xs">
              {lockedPoints.toLocaleString()} pts pending
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
