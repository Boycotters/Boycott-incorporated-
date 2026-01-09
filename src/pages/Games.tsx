import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, Trophy, Clock, RefreshCw, Medal, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfetti } from "@/hooks/useConfetti";
import { SpinWheel, MemoryMatch, Basketball, KeepyUppy } from "@/components/games";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from "date-fns";

interface PlaysRemaining {
  spin_wheel: number;
  memory_match: number;
  basketball: number;
  keepy_uppy: number;
}

interface PlayGameResult {
  success: boolean;
  message: string;
  points_earned?: number;
  plays_remaining?: number;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  total_score: number;
  best_score: number;
  games_played: number;
  rank: number;
}

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  game_type: string;
  prize_pool: number;
  start_time: string;
  end_time: string;
  status: string;
  max_participants: number | null;
  entry_fee: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
  game_type: string | null;
  earned?: boolean;
  earned_at?: string;
}

export default function Games() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fireConfetti } = useConfetti();
  
  const [mainTab, setMainTab] = useState("play");
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPlayingMemory, setIsPlayingMemory] = useState(false);
  const [isPlayingBasketball, setIsPlayingBasketball] = useState(false);
  const [isPlayingKeepy, setIsPlayingKeepy] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState("weekly");
  const [leaderboardGame, setLeaderboardGame] = useState("all");

  const { data: playsRemaining, isLoading, refetch } = useQuery({
    queryKey: ['game-plays-remaining', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_game_plays_remaining', {
        p_user_id: user?.id
      });
      if (error) throw error;
      return data as unknown as PlaysRemaining;
    },
    enabled: !!user?.id,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['game-leaderboard', leaderboardPeriod, leaderboardGame],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_game_leaderboard', {
        p_period: leaderboardPeriod,
        p_game_type: leaderboardGame === 'all' ? null : leaderboardGame
      });
      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
  });

  const { data: tournaments } = useQuery({
    queryKey: ['game-tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_tournaments')
        .select('*')
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as Tournament[];
    },
  });

  const { data: achievements } = useQuery({
    queryKey: ['game-achievements', user?.id],
    queryFn: async () => {
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('game_achievements')
        .select('*')
        .eq('is_active', true);
      if (achievementsError) throw achievementsError;

      const { data: userAchievements, error: userError } = await supabase
        .from('user_game_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user?.id);
      if (userError) throw userError;

      const earnedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);
      const earnedMap = Object.fromEntries(
        (userAchievements || []).map(ua => [ua.achievement_id, ua.earned_at])
      );

      return (allAchievements || []).map(a => ({
        ...a,
        earned: earnedIds.has(a.id),
        earned_at: earnedMap[a.id]
      })) as Achievement[];
    },
    enabled: !!user?.id,
  });

  const { data: myTournamentParticipations } = useQuery({
    queryKey: ['my-tournament-participations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('tournament_id')
        .eq('user_id', user?.id);
      if (error) throw error;
      return new Set((data || []).map(p => p.tournament_id));
    },
    enabled: !!user?.id,
  });

  const playGameMutation = useMutation({
    mutationFn: async ({ gameType, pointsEarned, score }: { gameType: string; pointsEarned: number; score?: number }) => {
      const { data, error } = await supabase.rpc('play_game', {
        p_user_id: user?.id,
        p_game_type: gameType,
        p_points_earned: pointsEarned,
        p_score: score || null
      });
      if (error) throw error;
      return data as unknown as PlayGameResult;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        fireConfetti();
        toast({ title: "Points Earned! 🎉", description: `You won ${variables.pointsEarned} points!` });
      } else {
        toast({ title: "Game Limit Reached", description: data.message });
      }
      queryClient.invalidateQueries({ queryKey: ['game-plays-remaining'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['game-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['game-achievements'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const joinTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const { data, error } = await supabase.rpc('join_tournament', {
        p_user_id: user?.id,
        p_tournament_id: tournamentId
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Joined Tournament! 🏆", description: data.message });
        queryClient.invalidateQueries({ queryKey: ['my-tournament-participations'] });
        queryClient.invalidateQueries({ queryKey: ['game-tournaments'] });
      } else {
        toast({ title: "Cannot Join", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSpinComplete = (points: number) => {
    setIsSpinning(false);
    playGameMutation.mutate({ gameType: 'spin_wheel', pointsEarned: points, score: points });
  };

  const handleSpinStart = (points: number) => {
    setIsSpinning(true);
    setTimeout(() => handleSpinComplete(points), 5000);
  };

  const totalPlaysRemaining = playsRemaining 
    ? (playsRemaining.spin_wheel + playsRemaining.memory_match + playsRemaining.basketball + playsRemaining.keepy_uppy)
    : 0;

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'spin_wheel': return '🎡';
      case 'memory_match': return '🧠';
      case 'basketball': return '🏀';
      case 'keepy_uppy': return '⚽';
      default: return '🎮';
    }
  };

  const getGameName = (gameType: string) => {
    switch (gameType) {
      case 'spin_wheel': return 'Spin Wheel';
      case 'memory_match': return 'Memory Match';
      case 'basketball': return 'Basketball';
      case 'keepy_uppy': return 'Keepy Uppy';
      default: return gameType;
    }
  };

  const getTournamentStatus = (tournament: Tournament) => {
    const now = new Date();
    const start = new Date(tournament.start_time);
    const end = new Date(tournament.end_time);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
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
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/earn')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              Play & Earn
            </h1>
            <p className="text-muted-foreground text-sm">Win points with fun mini games</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="play" className="flex flex-col py-2 gap-1">
              <Gamepad2 className="w-4 h-4" />
              <span className="text-xs">Play</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex flex-col py-2 gap-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs">Leaders</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex flex-col py-2 gap-1">
              <Medal className="w-4 h-4" />
              <span className="text-xs">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex flex-col py-2 gap-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Events</span>
            </TabsTrigger>
          </TabsList>

          {/* PLAY TAB */}
          <TabsContent value="play" className="mt-4 space-y-4">
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 rounded-2xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2.5 rounded-xl">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold">Games Available</p>
                      <p className="text-sm text-white/80">
                        {(playsRemaining as any)?.max_per_game || 1} play{((playsRemaining as any)?.max_per_game || 1) !== 1 ? 's' : ''} per game daily
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-white/80" />
                      <span className="text-sm text-white/80">Resets daily</span>
                    </div>
                    <Badge className="bg-white/20 text-white mt-1">{totalPlaysRemaining} plays left</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="spin" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                <TabsTrigger value="spin" className="flex flex-col py-2 gap-1">
                  <span className="text-lg">🎡</span>
                  <span className="text-xs">Spin</span>
                  {playsRemaining && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{playsRemaining.spin_wheel}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="memory" className="flex flex-col py-2 gap-1">
                  <span className="text-lg">🧠</span>
                  <span className="text-xs">Memory</span>
                  {playsRemaining && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{playsRemaining.memory_match}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="basketball" className="flex flex-col py-2 gap-1">
                  <span className="text-lg">🏀</span>
                  <span className="text-xs">Hoops</span>
                  {playsRemaining && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{playsRemaining.basketball}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="keepy" className="flex flex-col py-2 gap-1">
                  <span className="text-lg">⚽</span>
                  <span className="text-xs">Keepy</span>
                  {playsRemaining && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{playsRemaining.keepy_uppy}</Badge>}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="spin" className="mt-4">
                <SpinWheel playsRemaining={playsRemaining?.spin_wheel || 0} onSpin={handleSpinStart} isSpinning={isSpinning} />
              </TabsContent>
              <TabsContent value="memory" className="mt-4">
                <MemoryMatch playsRemaining={playsRemaining?.memory_match || 0} onComplete={(pts, score) => playGameMutation.mutate({ gameType: 'memory_match', pointsEarned: pts, score })} isPlaying={isPlayingMemory} setIsPlaying={setIsPlayingMemory} />
              </TabsContent>
              <TabsContent value="basketball" className="mt-4">
                <Basketball playsRemaining={playsRemaining?.basketball || 0} onComplete={(pts, score) => playGameMutation.mutate({ gameType: 'basketball', pointsEarned: pts, score })} isPlaying={isPlayingBasketball} setIsPlaying={setIsPlayingBasketball} />
              </TabsContent>
              <TabsContent value="keepy" className="mt-4">
                <KeepyUppy playsRemaining={playsRemaining?.keepy_uppy || 0} onComplete={(pts, score) => playGameMutation.mutate({ gameType: 'keepy_uppy', pointsEarned: pts, score })} isPlaying={isPlayingKeepy} setIsPlaying={setIsPlayingKeepy} />
              </TabsContent>
            </Tabs>

            <Card className="bg-gradient-card border border-border rounded-2xl">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><span>💡</span> Tips</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Each game can be played 3 times per day</li>
                  <li>• Spin the Wheel: Win 5-100 points (jackpot is rare!)</li>
                  <li>• Memory Match: Up to 95 points for perfect game</li>
                  <li>• Basketball: Score 10+ baskets for max points</li>
                  <li>• Keepy Uppy: Score 50+ kicks for max points</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEADERBOARD TAB */}
          <TabsContent value="leaderboard" className="mt-4 space-y-4">
            <Card className="bg-gradient-card border border-border rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Game Leaderboard
                </CardTitle>
                <CardDescription>Top players this {leaderboardPeriod}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                  <div className="flex gap-1">
                    {['daily', 'weekly', 'monthly', 'all_time'].map(period => (
                      <Button
                        key={period}
                        size="sm"
                        variant={leaderboardPeriod === period ? 'default' : 'outline'}
                        onClick={() => setLeaderboardPeriod(period)}
                        className="text-xs px-2 py-1 h-7"
                      >
                        {period === 'all_time' ? 'All' : period.charAt(0).toUpperCase() + period.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[{ key: 'all', label: 'All Games' }, { key: 'basketball', label: '🏀' }, { key: 'keepy_uppy', label: '⚽' }, { key: 'memory_match', label: '🧠' }].map(game => (
                    <Button
                      key={game.key}
                      size="sm"
                      variant={leaderboardGame === game.key ? 'default' : 'outline'}
                      onClick={() => setLeaderboardGame(game.key)}
                      className="text-xs px-2 py-1 h-7"
                    >
                      {game.label}
                    </Button>
                  ))}
                </div>

                {/* Leaderboard List */}
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {leaderboard && leaderboard.length > 0 ? (
                      leaderboard.map((entry, index) => (
                        <div
                          key={entry.user_id}
                          className={`flex items-center gap-3 p-3 rounded-xl ${
                            entry.user_id === user?.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-amber-700 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {entry.full_name || 'Anonymous'}
                              {entry.user_id === user?.id && <span className="text-primary ml-1">(You)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.games_played} games • Best: {entry.best_score}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{entry.total_score}</p>
                            <p className="text-xs text-muted-foreground">pts</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No scores yet!</p>
                        <p className="text-sm">Be the first to play!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACHIEVEMENTS TAB */}
          <TabsContent value="achievements" className="mt-4 space-y-4">
            <Card className="bg-gradient-card border border-border rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Medal className="w-5 h-5 text-yellow-500" />
                  Game Achievements
                </CardTitle>
                <CardDescription>
                  {achievements?.filter(a => a.earned).length || 0} / {achievements?.length || 0} unlocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {achievements?.map(achievement => (
                      <div
                        key={achievement.id}
                        className={`p-3 rounded-xl border ${
                          achievement.earned 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-muted/30 border-border opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-2xl ${!achievement.earned && 'grayscale'}`}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{achievement.name}</p>
                              {achievement.earned && (
                                <Badge variant="secondary" className="text-[10px]">✓</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {achievement.description}
                            </p>
                            {achievement.game_type && (
                              <Badge variant="outline" className="mt-1 text-[10px]">
                                {getGameIcon(achievement.game_type)} {getGameName(achievement.game_type)}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary text-sm">+{achievement.points_reward}</p>
                            {achievement.earned && achievement.earned_at && (
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(achievement.earned_at), 'MMM d')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!achievements || achievements.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Medal className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No achievements available</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TOURNAMENTS TAB */}
          <TabsContent value="tournaments" className="mt-4 space-y-4">
            <Card className="bg-gradient-card border border-border rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  Tournaments & Events
                </CardTitle>
                <CardDescription>Compete for big prizes!</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {tournaments && tournaments.length > 0 ? (
                      tournaments.map(tournament => {
                        const status = getTournamentStatus(tournament);
                        const isJoined = myTournamentParticipations?.has(tournament.id);
                        
                        return (
                          <div
                            key={tournament.id}
                            className={`p-4 rounded-xl border ${
                              status === 'active' 
                                ? 'bg-green-500/10 border-green-500/30' 
                                : 'bg-muted/30 border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{getGameIcon(tournament.game_type)}</span>
                                <div>
                                  <p className="font-semibold">{tournament.name}</p>
                                  <Badge 
                                    variant={status === 'active' ? 'default' : 'secondary'}
                                    className="text-[10px] mt-1"
                                  >
                                    {status === 'active' ? '🔴 LIVE' : status === 'upcoming' ? '⏰ Upcoming' : 'Ended'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-yellow-500 flex items-center gap-1">
                                  <Trophy className="w-4 h-4" />
                                  {tournament.prize_pool}
                                </p>
                                <p className="text-[10px] text-muted-foreground">prize pool</p>
                              </div>
                            </div>
                            
                            {tournament.description && (
                              <p className="text-sm text-muted-foreground mb-2">{tournament.description}</p>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                              <span>
                                {status === 'upcoming' 
                                  ? `Starts ${formatDistanceToNow(new Date(tournament.start_time), { addSuffix: true })}`
                                  : status === 'active'
                                    ? `Ends ${formatDistanceToNow(new Date(tournament.end_time), { addSuffix: true })}`
                                    : `Ended ${format(new Date(tournament.end_time), 'MMM d')}`
                                }
                              </span>
                              {tournament.entry_fee > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  Entry: {tournament.entry_fee} pts
                                </Badge>
                              )}
                            </div>
                            
                            {status !== 'ended' && (
                              <Button
                                size="sm"
                                className="w-full"
                                variant={isJoined ? 'secondary' : 'default'}
                                disabled={isJoined || joinTournamentMutation.isPending}
                                onClick={() => joinTournamentMutation.mutate(tournament.id)}
                              >
                                {isJoined ? (
                                  <>
                                    <Users className="w-4 h-4 mr-1" />
                                    Joined - Play Now!
                                  </>
                                ) : (
                                  <>
                                    <Trophy className="w-4 h-4 mr-1" />
                                    Join Tournament
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No active tournaments</p>
                        <p className="text-sm">Check back soon!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
