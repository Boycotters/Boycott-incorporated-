import { useState, useMemo } from "react";
import { ShoppingBag, Zap, Search, Filter, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FlashSaleCard, CategoryFilter, RewardCard } from "@/components/marketplace";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Marketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [confirmReward, setConfirmReward] = useState<any | null>(null);

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

  // Fetch user wallet with real-time updates
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Real-time balance updates
  });

  // Fetch redemption history
  const { data: redemptions } = useQuery({
    queryKey: ['redemptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redemptions')
        .select('*, rewards(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Redeem reward mutation - using secure server-side function
  const redeemMutation = useMutation({
    mutationFn: async (reward: any) => {
      const { data, error } = await supabase.rpc('redeem_reward', {
        p_user_id: user?.id,
        p_reward_id: reward.id,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; message: string; reward_name?: string; points_spent?: number };
      
      if (!result.success) {
        throw new Error(result.message);
      }

      return { ...reward, result };
    },
    onSuccess: (data) => {
      toast({
        title: "Reward redeemed! 🎁",
        description: `You've successfully redeemed ${data.name}. Check your email for details.`,
      });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      setConfirmReward(null);
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

  // Get unique categories
  const categories = useMemo(() => {
    if (!rewards) return [];
    const cats = [...new Set(rewards.map(r => r.category).filter(Boolean))];
    return cats as string[];
  }, [rewards]);

  // Filter rewards
  const filteredRewards = useMemo(() => {
    if (!rewards) return [];
    return rewards.filter(reward => {
      const matchesSearch = !searchQuery || 
        reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reward.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || reward.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [rewards, searchQuery, selectedCategory]);

  // Mock flash sales (in production, fetch from DB with time limits)
  const flashSales = useMemo(() => {
    if (!rewards || rewards.length < 2) return [];
    return rewards.slice(0, 2).map((reward, i) => ({
      reward,
      discount: i === 0 ? 30 : 20,
      endsAt: new Date(Date.now() + (i === 0 ? 2 * 60 * 60 * 1000 : 5 * 60 * 60 * 1000)),
    }));
  }, [rewards]);

  const handleRedeem = (reward: any) => {
    setConfirmReward(reward);
  };

  const confirmRedeem = () => {
    if (confirmReward) {
      redeemMutation.mutate(confirmReward);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Marketplace</h1>
              <p className="text-muted-foreground">Redeem your points for rewards</p>
            </div>
            <Badge variant="secondary" className="text-sm font-semibold">
              {filteredRewards.length} items
            </Badge>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-primary border-0 rounded-3xl overflow-hidden shadow-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-primary-foreground/80 text-sm mb-1">
                  Available Points
                </CardDescription>
                <CardTitle className="text-primary-foreground text-4xl">
                  {availablePoints.toLocaleString()}
                </CardTitle>
              </div>
              <div className="bg-primary-foreground/20 backdrop-blur-sm p-3 rounded-2xl">
                <ShoppingBag className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search rewards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        {/* Categories */}
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="flash" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Flash Sales
            </TabsTrigger>
            <TabsTrigger value="popular" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Popular
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-4">
            {/* Featured Reward */}
            {filteredRewards[0] && (
              <Card className="bg-card border rounded-3xl overflow-hidden shadow-hover">
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <img
                    src={filteredRewards[0].image || "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400"}
                    alt={filteredRewards[0].name}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground">
                    Featured
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle>{filteredRewards[0].name}</CardTitle>
                  <CardDescription>{filteredRewards[0].description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-accent">
                      {filteredRewards[0].points_cost} pts
                    </span>
                    <Button
                      onClick={() => handleRedeem(filteredRewards[0])}
                      disabled={availablePoints < filteredRewards[0].points_cost || redeemMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {redeemMutation.isPending ? "Processing..." : "Redeem Now"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Rewards Grid */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">All Rewards</h2>
              <div className="space-y-3">
                {filteredRewards.slice(1).map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    canAfford={availablePoints >= reward.points_cost}
                    onRedeem={() => handleRedeem(reward)}
                    isPending={redeemMutation.isPending}
                    isCompact
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="flash" className="mt-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-accent animate-pulse" />
              <h2 className="text-lg font-semibold">Limited Time Offers</h2>
            </div>
            
            {flashSales.length > 0 ? (
              <div className="space-y-3">
                {flashSales.map((sale, i) => (
                  <FlashSaleCard
                    key={sale.reward.id}
                    reward={sale.reward}
                    discount={sale.discount}
                    endsAt={sale.endsAt}
                    onRedeem={() => handleRedeem(sale.reward)}
                    disabled={availablePoints < sale.reward.points_cost}
                    isPending={redeemMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No flash sales available right now</p>
                <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="popular" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {filteredRewards.slice(0, 4).map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  canAfford={availablePoints >= reward.points_cost}
                  onRedeem={() => handleRedeem(reward)}
                  isPending={redeemMutation.isPending}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent Redemptions */}
        {redemptions && redemptions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Your Recent Redemptions</h2>
            <div className="space-y-2">
              {redemptions.map((redemption: any) => (
                <Card key={redemption.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                        <img
                          src={redemption.rewards?.image || "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=100"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{redemption.rewards?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(redemption.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={redemption.status === 'completed' ? 'default' : 'secondary'}>
                      {redemption.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmReward} onOpenChange={() => setConfirmReward(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Redemption</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to redeem <strong>{confirmReward?.name}</strong> for{' '}
              <strong>{confirmReward?.points_cost} points</strong>?
              <br /><br />
              You'll have <strong>{(availablePoints - (confirmReward?.points_cost || 0)).toLocaleString()} points</strong> remaining.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRedeem} disabled={redeemMutation.isPending}>
              {redeemMutation.isPending ? "Processing..." : "Confirm Redeem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
