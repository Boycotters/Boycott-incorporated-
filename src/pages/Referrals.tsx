import { ArrowLeft, Copy, Users, Gift, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export default function Referrals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['user-referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: referrals } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:referred_id(full_name, created_at)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const referralCode = userData?.referral_code || 'Loading...';
  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;
  const shareMessage = `🎉 Join Boycott Inc. and start earning real money! Use my referral code: ${referralCode}\n\n✅ Complete tasks\n✅ Play games\n✅ Watch videos\n✅ Cash out to Mobile Money\n\nSign up here: ${referralLink}`;

  const copyToClipboard = async (text: string, isShareMessage = false) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(isShareMessage ? 'Invite message copied!' : 'Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Boycott Inc.',
          text: shareMessage,
          url: referralLink,
        });
      } catch {
        copyToClipboard(shareMessage, true);
      }
    } else {
      copyToClipboard(shareMessage, true);
    }
  };

  const totalEarned = referrals?.reduce((sum, ref) => sum + (ref.bonus_points || 0), 0) || 0;

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Referral Program</h1>
        </div>

        {/* Referral Card */}
        <Card className="bg-gradient-primary p-6 rounded-3xl shadow-hover border-0">
          <div className="text-center mb-6">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">
              Invite Friends, Earn Points!
            </h2>
            <p className="text-white/80 text-sm">
              Share your referral code and earn 100 points for each friend who joins!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl mb-4">
            <p className="text-white/60 text-xs mb-2 text-center">Your Referral Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-white font-mono text-2xl font-bold tracking-wider">
                {referralCode}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-xl bg-white/20 hover:bg-white/30 text-white"
                onClick={() => copyToClipboard(referralCode)}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-white text-primary hover:bg-white/90 font-bold rounded-xl"
              onClick={() => copyToClipboard(referralLink)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button
              className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl"
              onClick={handleShare}
            >
              <Gift className="w-4 h-4 mr-2" />
              Share Invite
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border text-center">
            <div className="bg-secondary p-2 rounded-xl inline-flex mb-2">
              <Users className="w-5 h-5 text-secondary-foreground" />
            </div>
            <p className="font-bold text-2xl">{referrals?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Friends Invited</p>
          </Card>
          <Card className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border text-center">
            <div className="bg-secondary p-2 rounded-xl inline-flex mb-2">
              <Gift className="w-5 h-5 text-secondary-foreground" />
            </div>
            <p className="font-bold text-2xl">{totalEarned}</p>
            <p className="text-xs text-muted-foreground mt-1">Points Earned</p>
          </Card>
        </div>

        {/* Referrals List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Your Referrals</h3>
          
          {referrals && referrals.length > 0 ? (
            referrals.map((referral) => (
              <Card 
                key={referral.id}
                className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary p-2 rounded-xl">
                      <Users className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {(referral.referred as any)?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(referral.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-green-500 font-bold">
                    +{referral.bonus_points} pts
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-gradient-card p-8 rounded-2xl shadow-card border border-border text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Referrals Yet</h3>
              <p className="text-muted-foreground text-sm">
                Share your code with friends to start earning bonus points!
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
