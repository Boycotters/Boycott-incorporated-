import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Lock, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface VipTier {
  id: string;
  name: string;
  slug: string;
  min_points: number;
  multiplier: number;
  icon: string;
  color: string;
  benefits: string[];
}

const VIP = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: userData } = useQuery({
    queryKey: ['user-vip', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('total_points, vip_tier')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['vip-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_tiers')
        .select('*')
        .order('min_points', { ascending: true });
      if (error) throw error;
      return data as VipTier[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentTierSlug = userData?.vip_tier || 'bronze';
  const totalPoints = userData?.total_points || 0;
  const currentTier = tiers?.find(t => t.slug === currentTierSlug);
  const currentTierIndex = tiers?.findIndex(t => t.slug === currentTierSlug) || 0;
  const nextTier = tiers?.[currentTierIndex + 1];

  const progressToNext = nextTier 
    ? Math.min(100, ((totalPoints - (currentTier?.min_points || 0)) / (nextTier.min_points - (currentTier?.min_points || 0))) * 100)
    : 100;

  const getTierGradient = (slug: string) => {
    switch (slug) {
      case 'bronze': return 'from-amber-700 to-amber-500';
      case 'silver': return 'from-slate-400 to-slate-300';
      case 'gold': return 'from-yellow-500 to-amber-300';
      case 'diamond': return 'from-cyan-400 to-blue-300';
      default: return 'from-primary to-primary/80';
    }
  };

  const getTierBg = (slug: string) => {
    switch (slug) {
      case 'bronze': return 'bg-amber-900/20 border-amber-700/50';
      case 'silver': return 'bg-slate-400/20 border-slate-400/50';
      case 'gold': return 'bg-yellow-500/20 border-yellow-500/50';
      case 'diamond': return 'bg-cyan-400/20 border-cyan-400/50';
      default: return 'bg-muted border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className={`bg-gradient-to-br ${getTierGradient(currentTierSlug)} p-6 pt-12`}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 text-white/80 hover:text-white hover:bg-white/10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center text-white">
          <div className="text-6xl mb-2">{currentTier?.icon}</div>
          <h1 className="text-2xl font-bold mb-1">{currentTier?.name} Member</h1>
          <p className="text-white/80 text-sm">
            {currentTier?.multiplier && currentTier.multiplier > 1 
              ? `${Math.round((currentTier.multiplier - 1) * 100)}% bonus on all points!`
              : 'Complete tasks to level up!'}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Progress Card */}
        {nextTier && (
          <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress to {nextTier.name}</span>
                <span className="text-sm text-muted-foreground">
                  {totalPoints.toLocaleString()} / {nextTier.min_points.toLocaleString()} pts
                </span>
              </div>
              <Progress value={progressToNext} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {(nextTier.min_points - totalPoints).toLocaleString()} points to unlock {nextTier.icon} {nextTier.name}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Current Benefits */}
        <Card className={`border-2 ${getTierBg(currentTierSlug)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Current Benefits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentTier?.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* All Tiers */}
        <h2 className="text-lg font-semibold flex items-center gap-2 pt-2">
          <Crown className="h-5 w-5 text-primary" />
          VIP Tiers
        </h2>

        <div className="space-y-3">
          {tiers?.map((tier, index) => {
            const isCurrentTier = tier.slug === currentTierSlug;
            const isUnlocked = totalPoints >= tier.min_points;
            
            return (
              <Card 
                key={tier.id} 
                className={`border-2 transition-all ${
                  isCurrentTier 
                    ? getTierBg(tier.slug) + ' ring-2 ring-primary' 
                    : isUnlocked 
                      ? 'border-border/50' 
                      : 'border-border/30 opacity-70'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl ${!isUnlocked && 'grayscale'}`}>
                        {tier.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{tier.name}</h3>
                          {isCurrentTier && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                          {!isUnlocked && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tier.min_points.toLocaleString()} points required
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold bg-gradient-to-r ${getTierGradient(tier.slug)} bg-clip-text text-transparent`}>
                        {tier.multiplier > 1 ? `${tier.multiplier}x` : '1x'}
                      </span>
                      <p className="text-xs text-muted-foreground">multiplier</p>
                    </div>
                  </div>
                  
                  {/* Benefits preview */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-1">
                      {tier.benefits.slice(0, 4).map((benefit, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                          {isUnlocked ? (
                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <Lock className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate">{benefit}</span>
                        </div>
                      ))}
                    </div>
                    {tier.benefits.length > 4 && (
                      <p className="text-xs text-primary mt-1">
                        +{tier.benefits.length - 4} more benefits
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VIP;
