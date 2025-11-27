import { Gift, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Marketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch rewards
  const { data: rewards, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user wallet
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Redeem reward mutation
  const redeemMutation = useMutation({
    mutationFn: async (reward: any) => {
      const availablePoints = wallet?.available_points || 0;
      
      if (availablePoints < reward.points_cost) {
        throw new Error('Insufficient points');
      }

      // Create redemption record
      const { error: redemptionError } = await supabase
        .from('redemptions')
        .insert({
          user_id: user?.id,
          reward_id: reward.id,
          points_spent: reward.points_cost,
          status: 'pending',
        });

      if (redemptionError) throw redemptionError;

      // Deduct points from wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          available_points: availablePoints - reward.points_cost,
        })
        .eq('user_id', user?.id);

      if (walletError) throw walletError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          type: 'redeem',
          points_amount: -reward.points_cost,
          description: `Redeemed: ${reward.name}`,
        });

      if (transactionError) throw transactionError;

      return reward;
    },
    onSuccess: (reward) => {
      toast({
        title: "Reward redeemed! 🎁",
        description: `You've successfully redeemed ${reward.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const availablePoints = wallet?.available_points || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Redeem your points for rewards</p>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-primary border-0 rounded-3xl overflow-hidden shadow-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-white/80 text-sm mb-1">Available Points</CardDescription>
                <CardTitle className="text-white text-4xl">{availablePoints.toLocaleString()}</CardTitle>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Featured Reward */}
        {rewards && rewards.length > 0 && (
          <Card className="bg-gradient-card border border-border rounded-3xl overflow-hidden shadow-hover">
            <div className="aspect-video relative overflow-hidden bg-muted">
              <img
                src={rewards[0].image || "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400"}
                alt={rewards[0].name}
                className="w-full h-full object-cover"
              />
              <Badge className="absolute top-4 left-4 bg-accent text-white">Featured</Badge>
            </div>
            <CardHeader>
              <CardTitle>{rewards[0].name}</CardTitle>
              <CardDescription>{rewards[0].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-accent">{rewards[0].points_cost} pts</span>
                <Button
                  onClick={() => redeemMutation.mutate(rewards[0])}
                  disabled={availablePoints < rewards[0].points_cost || redeemMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {redeemMutation.isPending ? "Processing..." : "Redeem Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Rewards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Rewards</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {rewards?.slice(1).map((reward) => (
              <Card key={reward.id} className="bg-gradient-card border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-hover transition-all duration-300">
                <div className="flex gap-4 p-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                    <img
                      src={reward.image || "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400"}
                      alt={reward.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-base mb-1">{reward.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{reward.category}</Badge>
                        <span className="text-sm font-bold text-accent">{reward.points_cost} pts</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => redeemMutation.mutate(reward)}
                        disabled={availablePoints < reward.points_cost || redeemMutation.isPending}
                        className="bg-primary hover:bg-primary/90"
                      >
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
    </div>
  );
}