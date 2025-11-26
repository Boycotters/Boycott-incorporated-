import { Gift, ShoppingCart, Sparkles, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const rewards = [
  {
    id: 1,
    name: "Coffee Gift Card",
    description: "$5 Starbucks",
    points: 500,
    image: "☕",
    stock: "Limited",
    category: "Food & Drink",
  },
  {
    id: 2,
    name: "Premium Subscription",
    description: "1 Month Spotify",
    points: 1000,
    image: "🎵",
    stock: "Available",
    category: "Entertainment",
  },
  {
    id: 3,
    name: "Amazon Voucher",
    description: "$10 Gift Card",
    points: 800,
    image: "🛍️",
    stock: "Available",
    category: "Shopping",
  },
  {
    id: 4,
    name: "Movie Tickets",
    description: "2 tickets",
    points: 600,
    image: "🎬",
    stock: "Available",
    category: "Entertainment",
  },
];

export default function Marketplace() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Redeem your points for rewards</p>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-primary p-6 rounded-3xl shadow-hover border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Available Points</p>
              <h2 className="text-white text-4xl font-bold">2,450</h2>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
        </Card>

        {/* Featured Reward */}
        <Card className="bg-gradient-accent p-6 rounded-3xl shadow-hover border-0 overflow-hidden">
          <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 rounded-xl mb-3">
            Featured
          </Badge>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-2xl mb-2">🎁</p>
              <h3 className="text-white text-xl font-bold mb-1">Mystery Box</h3>
              <p className="text-white/80 text-sm mb-3">Surprise gift inside!</p>
              <Button
                size="lg"
                className="bg-white text-accent hover:bg-white/90 font-bold rounded-2xl"
              >
                Redeem 1500 pts
              </Button>
            </div>
          </div>
        </Card>

        {/* Rewards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Rewards</h3>
            <Button variant="ghost" size="sm" className="rounded-xl">
              <Tag className="w-4 h-4 mr-1" />
              Filters
            </Button>
          </div>

          {rewards.map((reward) => (
            <Card
              key={reward.id}
              className="bg-gradient-card p-5 rounded-3xl shadow-card border border-border hover:shadow-hover transition-all duration-300"
            >
              <div className="flex gap-4">
                <div className="bg-secondary p-4 rounded-2xl h-fit text-3xl flex items-center justify-center w-20 h-20">
                  {reward.image}
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-bold text-base">{reward.name}</h3>
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                      </div>
                      {reward.stock === "Limited" && (
                        <Badge variant="destructive" className="rounded-lg text-xs">
                          Limited
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="rounded-lg text-xs mt-2">
                      {reward.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span className="font-bold text-lg">{reward.points} pts</span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 rounded-xl font-semibold"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Redeem
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
