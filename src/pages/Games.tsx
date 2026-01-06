import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, Trophy, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfetti } from "@/hooks/useConfetti";
import { SpinWheel, MemoryMatch, ScratchCard, KeepyUppy } from "@/components/games";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlaysRemaining {
  spin_wheel: number;
  memory_match: number;
  scratch_card: number;
  keepy_uppy: number;
}

interface PlayGameResult {
  success: boolean;
  message: string;
  points_earned?: number;
  plays_remaining?: number;
}

export default function Games() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fireConfetti } = useConfetti();
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPlayingMemory, setIsPlayingMemory] = useState(false);
  const [isScratchingCard, setIsScratchingCard] = useState(false);
  const [isPlayingKeepy, setIsPlayingKeepy] = useState(false);

  // Fetch remaining plays for each game
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

  // Play game mutation
  const playGameMutation = useMutation({
    mutationFn: async ({ 
      gameType, 
      pointsEarned, 
      score 
    }: { 
      gameType: string; 
      pointsEarned: number; 
      score?: number;
    }) => {
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
        toast({
          title: "Points Earned! 🎉",
          description: `You won ${variables.pointsEarned} points!`,
        });
      } else {
        toast({
          title: "Game Limit Reached",
          description: data.message,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['game-plays-remaining'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user-data'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSpinComplete = (points: number) => {
    setIsSpinning(false);
    playGameMutation.mutate({ gameType: 'spin_wheel', pointsEarned: points });
  };

  const handleSpinStart = (points: number) => {
    setIsSpinning(true);
    // The actual mutation happens when spin completes
    setTimeout(() => {
      handleSpinComplete(points);
    }, 4000);
  };

  const handleMemoryComplete = (points: number, score: number) => {
    playGameMutation.mutate({ gameType: 'memory_match', pointsEarned: points, score });
  };

  const handleScratchReveal = (points: number) => {
    playGameMutation.mutate({ gameType: 'scratch_card', pointsEarned: points });
  };

  const handleKeepyComplete = (points: number, score: number) => {
    playGameMutation.mutate({ gameType: 'keepy_uppy', pointsEarned: points, score });
  };

  const totalPlaysRemaining = playsRemaining 
    ? (playsRemaining.spin_wheel + playsRemaining.memory_match + playsRemaining.scratch_card + playsRemaining.keepy_uppy)
    : 0;

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

        {/* Stats Card */}
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Games Available</p>
                  <p className="text-sm text-white/80">3 plays per game daily</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-white/80" />
                  <span className="text-sm text-white/80">Resets daily</span>
                </div>
                <Badge className="bg-white/20 text-white mt-1">
                  {totalPlaysRemaining} plays left
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Games Tabs */}
        <Tabs defaultValue="spin" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="spin" className="flex flex-col py-2 gap-1">
              <span className="text-lg">🎡</span>
              <span className="text-xs">Spin</span>
              {playsRemaining && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {playsRemaining.spin_wheel}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="memory" className="flex flex-col py-2 gap-1">
              <span className="text-lg">🧠</span>
              <span className="text-xs">Memory</span>
              {playsRemaining && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {playsRemaining.memory_match}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="scratch" className="flex flex-col py-2 gap-1">
              <span className="text-lg">🎴</span>
              <span className="text-xs">Scratch</span>
              {playsRemaining && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {playsRemaining.scratch_card}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="keepy" className="flex flex-col py-2 gap-1">
              <span className="text-lg">⚽</span>
              <span className="text-xs">Keepy</span>
              {playsRemaining && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {playsRemaining.keepy_uppy}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="spin" className="mt-4">
            <SpinWheel
              playsRemaining={playsRemaining?.spin_wheel || 0}
              onSpin={handleSpinStart}
              isSpinning={isSpinning}
            />
          </TabsContent>
          
          <TabsContent value="memory" className="mt-4">
            <MemoryMatch
              playsRemaining={playsRemaining?.memory_match || 0}
              onComplete={handleMemoryComplete}
              isPlaying={isPlayingMemory}
              setIsPlaying={setIsPlayingMemory}
            />
          </TabsContent>
          
          <TabsContent value="scratch" className="mt-4">
            <ScratchCard
              playsRemaining={playsRemaining?.scratch_card || 0}
              onReveal={handleScratchReveal}
              isScratching={isScratchingCard}
            />
          </TabsContent>
          
          <TabsContent value="keepy" className="mt-4">
            <KeepyUppy
              playsRemaining={playsRemaining?.keepy_uppy || 0}
              onComplete={handleKeepyComplete}
              isPlaying={isPlayingKeepy}
              setIsPlaying={setIsPlayingKeepy}
            />
          </TabsContent>
        </Tabs>

        {/* Game Tips */}
        <Card className="bg-gradient-card border border-border rounded-2xl">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>💡</span> Tips
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Each game can be played 3 times per day</li>
              <li>• Spin the Wheel: Win 10-100 points per spin</li>
              <li>• Memory Match: Up to 95 points for a perfect game</li>
              <li>• Scratch Card: Rare jackpot of 200 points!</li>
              <li>• Keepy Uppy: Score 50+ kicks for max points</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
