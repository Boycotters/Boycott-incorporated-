import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Timer, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashSaleCardProps {
  reward: {
    id: string;
    name: string;
    points_cost: number;
    image?: string;
    description?: string;
  };
  discount: number;
  endsAt: Date;
  onRedeem: () => void;
  disabled?: boolean;
  isPending?: boolean;
}

export function FlashSaleCard({ 
  reward, 
  discount, 
  endsAt, 
  onRedeem, 
  disabled,
  isPending 
}: FlashSaleCardProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = endsAt.getTime();
      const diff = Math.max(0, end - now);

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const originalPrice = Math.round(reward.points_cost / (1 - discount / 100));
  const isUrgent = timeLeft.hours < 1;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-hover",
      "bg-gradient-to-br from-accent/10 via-card to-card border-accent/20",
      isUrgent && "animate-pulse border-destructive/50"
    )}>
      {/* Flash badge */}
      <div className="absolute top-0 right-0">
        <Badge className="rounded-none rounded-bl-xl bg-accent text-accent-foreground font-bold">
          <Zap className="w-3 h-3 mr-1" />
          {discount}% OFF
        </Badge>
      </div>

      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Image */}
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            <img
              src={reward.image || "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=200"}
              alt={reward.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{reward.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {reward.description}
            </p>
            
            {/* Price */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg font-bold text-accent">{reward.points_cost}</span>
              <span className="text-xs text-muted-foreground line-through">{originalPrice}</span>
              <span className="text-xs">pts</span>
            </div>
          </div>
        </div>

        {/* Timer and CTA */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            {isUrgent ? (
              <Flame className="w-4 h-4 text-destructive animate-bounce" />
            ) : (
              <Timer className="w-4 h-4 text-muted-foreground" />
            )}
            <span className={cn(
              "text-xs font-mono font-semibold",
              isUrgent ? "text-destructive" : "text-muted-foreground"
            )}>
              {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
          
          <Button
            size="sm"
            onClick={onRedeem}
            disabled={disabled || isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            {isPending ? "..." : "Grab Deal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
