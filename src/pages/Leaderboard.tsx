import { ArrowLeft, Crown, Trophy, Medal, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardUser {
  id: string;
  full_name: string | null;
  total_points: number | null;
  vip_tier: string | null;
  current_streak: number | null;
  level: number | null;
}

const getTierEmoji = (tier: string | null) => {
  switch (tier) {
    case 'diamond': return '💎';
    case 'gold': return '🥇';
    case 'silver': return '🥈';
    default: return '🥉';
  }
};

const getTierColor = (tier: string | null) => {
  switch (tier) {
    case 'diamond': return 'bg-purple-500/20 text-purple-500';
    case 'gold': return 'bg-yellow-500/20 text-yellow-500';
    case 'silver': return 'bg-gray-400/20 text-gray-400';
    default: return 'bg-orange-500/20 text-orange-500';
  }
};

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch all-time leaderboard
  const { data: allTimeLeaders, isLoading: allTimeLoading } = useQuery({
    queryKey: ['leaderboard-all-time'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as LeaderboardUser[];
    },
  });

  // Fetch user's rank
  const { data: userRank } = useQuery({
    queryKey: ['user-rank', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get user's points
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('total_points, full_name, vip_tier')
        .eq('id', user.id)
        .single();
      
      if (userError) throw userError;
      
      // Count how many users have more points
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('total_points', userData.total_points || 0);
      
      if (countError) throw countError;
      
      return {
        rank: (count || 0) + 1,
        ...userData
      };
    },
    enabled: !!user?.id,
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-500" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500/20 to-amber-400/10 border-orange-500/30';
    return 'bg-card';
  };

  if (allTimeLoading) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Leaderboard
              <Trophy className="w-6 h-6 text-yellow-500" />
            </h1>
            <p className="text-sm text-muted-foreground">Top earners on the platform</p>
          </div>
        </div>

        {/* Your Rank Card */}
        {userRank && (
          <Card className="bg-gradient-primary border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Your Rank</p>
                    <p className="text-white text-2xl font-bold">#{userRank.rank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm">Total Points</p>
                  <p className="text-white text-2xl font-bold">
                    {(userRank.total_points || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 Podium */}
        {allTimeLeaders && allTimeLeaders.length >= 3 && (
          <div className="flex items-end justify-center gap-3 py-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <Avatar className="w-14 h-14 border-2 border-gray-400">
                <AvatarFallback className="bg-gray-400/20 text-gray-600 font-bold">
                  {(allTimeLeaders[1]?.full_name || 'A').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Medal className="w-5 h-5 text-gray-400 -mt-2" />
              <p className="text-sm font-medium mt-1 truncate max-w-[80px]">
                {allTimeLeaders[1]?.full_name || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground">
                {(allTimeLeaders[1]?.total_points || 0).toLocaleString()} pts
              </p>
              <div className="bg-gray-400/20 rounded-t-lg w-20 h-16 mt-2" />
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <Avatar className="w-16 h-16 border-2 border-yellow-500">
                <AvatarFallback className="bg-yellow-500/20 text-yellow-600 font-bold text-lg">
                  {(allTimeLeaders[0]?.full_name || 'A').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Crown className="w-6 h-6 text-yellow-500 -mt-2" />
              <p className="text-sm font-semibold mt-1 truncate max-w-[80px]">
                {allTimeLeaders[0]?.full_name || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground">
                {(allTimeLeaders[0]?.total_points || 0).toLocaleString()} pts
              </p>
              <div className="bg-yellow-500/20 rounded-t-lg w-20 h-24 mt-2" />
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <Avatar className="w-12 h-12 border-2 border-orange-500">
                <AvatarFallback className="bg-orange-500/20 text-orange-600 font-bold">
                  {(allTimeLeaders[2]?.full_name || 'A').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Medal className="w-5 h-5 text-orange-500 -mt-2" />
              <p className="text-sm font-medium mt-1 truncate max-w-[80px]">
                {allTimeLeaders[2]?.full_name || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground">
                {(allTimeLeaders[2]?.total_points || 0).toLocaleString()} pts
              </p>
              <div className="bg-orange-500/20 rounded-t-lg w-20 h-12 mt-2" />
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            All-Time Rankings
          </h3>
          
          {allTimeLeaders?.map((leader, index) => {
            const rank = index + 1;
            const isCurrentUser = leader.id === user?.id;
            
            return (
              <Card 
                key={leader.id}
                className={`${getRankBg(rank)} ${isCurrentUser ? 'ring-2 ring-primary' : ''} rounded-xl`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center">
                      {getRankIcon(rank)}
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {(leader.full_name || 'A').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {leader.full_name || 'Anonymous'}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getTierEmoji(leader.vip_tier)} {leader.vip_tier || 'Bronze'}</span>
                        <span>•</span>
                        <span>Level {leader.level || 1}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {(leader.total_points || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(!allTimeLeaders || allTimeLeaders.length === 0) && (
            <Card className="p-8 text-center rounded-2xl">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Rankings Yet</h3>
              <p className="text-muted-foreground text-sm">
                Be the first to earn points and top the leaderboard!
              </p>
              <Button className="mt-4" onClick={() => navigate('/earn')}>
                Start Earning
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
