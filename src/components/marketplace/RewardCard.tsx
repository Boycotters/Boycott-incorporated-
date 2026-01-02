import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface RewardCardProps {
  reward: {
    id: string;
    name: string;
    description?: string;
    points_cost: number;
    image?: string;
    category?: string;
    stock?: number;
  };
  canAfford: boolean;
  onRedeem: () => void;
  isPending?: boolean;
  isCompact?: boolean;
}

export function RewardCard({ 
  reward, 
  canAfford, 
  onRedeem, 
  isPending,
  isCompact = false 
}: RewardCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const isLowStock = reward.stock !== undefined && reward.stock < 10;

  if (isCompact) {
    return (
      <Card className="bg-card border rounded-2xl overflow-hidden hover:shadow-hover transition-all duration-300">
        <CardContent className="p-0">
          <div className="flex gap-3 p-3">
            {/* Thumbnail */}
            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={reward.image || "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=200"}
                alt={reward.name}
                className="w-full h-full object-cover"
              />
              {isLowStock && (
                <Badge className="absolute bottom-1 left-1 text-[10px] px-1 py-0 bg-destructive/90">
                  {reward.stock} left
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <h3 className="font-semibold text-sm line-clamp-1">{reward.name}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsWishlisted(!isWishlisted); }}
                    className="p-1 -m-1"
                  >
                    <Heart 
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isWishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"
                      )} 
                    />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {reward.description}
                </p>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {reward.category}
                  </Badge>
                  <span className="text-sm font-bold text-accent">{reward.points_cost} pts</span>
                </div>
                <Button
                  size="sm"
                  onClick={onRedeem}
                  disabled={!canAfford || isPending}
                  variant={canAfford ? "default" : "outline"}
                  className="h-7 text-xs px-3"
                >
                  {isPending ? "..." : canAfford ? "Redeem" : "Need more"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border rounded-2xl overflow-hidden hover:shadow-hover transition-all duration-300 group">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={reward.image || "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400"}
          alt={reward.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Wishlist button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsWishlisted(!isWishlisted); }}
          className={cn(
            "absolute top-2 right-2 p-2 rounded-full transition-all",
            isWishlisted 
              ? "bg-destructive/90 text-destructive-foreground" 
              : "bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive"
          )}
        >
          <Heart className={cn("w-4 h-4", isWishlisted && "fill-current")} />
        </button>

        {/* Stock badge */}
        {isLowStock && (
          <Badge className="absolute bottom-2 left-2 bg-destructive/90 text-destructive-foreground">
            Only {reward.stock} left!
          </Badge>
        )}

        {/* Overlay on affordable */}
        {canAfford && (
          <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-accent" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold line-clamp-1">{reward.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {reward.description}
              </p>
            </div>
          </div>

          {/* Rating mock */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={cn(
                  "w-3 h-3",
                  star <= 4 ? "fill-accent text-accent" : "text-muted"
                )} 
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">(128)</span>
          </div>

          {/* Price and CTA */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xl font-bold text-accent">{reward.points_cost}</span>
              <span className="text-sm text-muted-foreground ml-1">pts</span>
            </div>
            <Button
              onClick={onRedeem}
              disabled={!canAfford || isPending}
              className={cn(
                "font-semibold",
                canAfford 
                  ? "bg-primary hover:bg-primary/90" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isPending ? "Processing..." : canAfford ? "Redeem Now" : `${reward.points_cost - 0} more`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
