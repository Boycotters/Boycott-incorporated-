import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown, 
  Coins,
  Heart,
  Share2,
  ArrowLeft,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { WeekendBreakMessage } from "@/components/WeekendBreakMessage";
import { useDailyLimits } from "@/hooks/useDailyLimits";
import { DailyCapReached } from "@/components/DailyCapReached";


interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  points_reward: number;
  category: string;
  source: string;
  partner_name: string | null;
  view_count: number;
  is_active: boolean;
}

interface VideoView {
  video_id: string;
  completed: boolean;
  points_awarded: number;
}

interface CompleteVideoResult {
  success: boolean;
  message: string;
  points?: number;
  video_title?: string;
  already_completed?: boolean;
}

export default function Videos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isWeekendBlocked, hasCampaign, canDoActivity, refetch: refetchLimits, hasReachedDailyCap, totalPointsEarned, maxDailyPoints } = useDailyLimits();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [watchTime, setWatchTime] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch videos
  const { data: videos, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const [{ data: regular, error }, { data: aiVids }] = await Promise.all([
        supabase
          .from('videos')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('ai_generated_videos')
          .select('*')
          .eq('is_active', true)
          .in('target_placement', ['videos', 'all'])
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      if (error) throw error;
      const aiMapped: Video[] = (aiVids || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        description: v.prompt,
        video_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        duration_seconds: v.duration_seconds || 30,
        points_reward: v.points_reward || 5,
        category: 'ai',
        source: 'ai',
        partner_name: 'AI',
        view_count: 0,
        is_active: true,
      }));
      return [...aiMapped, ...((regular || []) as Video[])];
    },
  });

  // Fetch user's watched videos - only today's watches count for daily reset
  const { data: watchedVideos } = useQuery({
    queryKey: ['watched-videos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('user_video_views')
        .select('video_id, completed, points_awarded')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('watched_at', todayStart.toISOString());
      
      if (error) throw error;
      return data as VideoView[];
    },
    enabled: !!user?.id,
  });

  // Complete video mutation
  const completeMutation = useMutation({
    mutationFn: async ({ videoId, duration }: { videoId: string; duration: number }) => {
      const { data, error } = await supabase.rpc('complete_video_watch', {
        p_user_id: user?.id,
        p_video_id: videoId,
        p_watch_duration: duration,
      });
      
      if (error) throw error;
      return data as unknown as CompleteVideoResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`+${result.points} points earned!`, {
          description: result.video_title,
        });
        queryClient.invalidateQueries({ queryKey: ['watched-videos'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['user-data'] });
        queryClient.invalidateQueries({ queryKey: ['daily-activity-status'] });
        refetchLimits();
      } else if (!result.already_completed) {
        toast.info(result.message);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const currentVideo = videos?.[currentIndex];
  const isVideoWatched = watchedVideos?.find(
    (v) => v.video_id === currentVideo?.id && v.completed
  );
  const requiredWatchTime = currentVideo 
    ? Math.floor(currentVideo.duration_seconds * 0.8)
    : 0;
  const canComplete = watchTime >= requiredWatchTime && !isVideoWatched;

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || currentVideo?.duration_seconds || 30;
      setProgress((current / duration) * 100);
      setWatchTime(Math.floor(current));
    }
  }, [currentVideo?.duration_seconds]);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
    if (currentVideo && !isVideoWatched) {
      completeMutation.mutate({
        videoId: currentVideo.id,
        duration: currentVideo.duration_seconds,
      });
    }
  }, [currentVideo, isVideoWatched, completeMutation]);

  const goToNext = useCallback(() => {
    if (videos && currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setWatchTime(0);
      setIsPlaying(true);
    }
  }, [videos, currentIndex]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setWatchTime(0);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    setTouchStart(null);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleClaim = () => {
    if (!canDoActivity('videos')) {
      toast.error("Daily video limit reached. Come back tomorrow!");
      return;
    }
    if (currentVideo && canComplete) {
      completeMutation.mutate({
        videoId: currentVideo.id,
        duration: watchTime,
      });
    }
  };

  // Auto-play when video changes
  useEffect(() => {
    if (videoRef.current && currentVideo) {
      videoRef.current.load();
      videoRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  }, [currentIndex, currentVideo?.id]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          goToPrev();
          break;
        case 'ArrowDown':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasReachedDailyCap) {
    return <DailyCapReached earned={totalPointsEarned} cap={maxDailyPoints} />;
  }

  // Show weekend break message if videos are blocked
  if (isWeekendBlocked) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4"
          onClick={() => navigate('/earn')}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="max-w-md w-full">
          <WeekendBreakMessage />
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4">
        <Play className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Videos Yet</h2>
        <p className="text-muted-foreground text-center mb-4">
          Check back later for new content!
        </p>
        <Button onClick={() => navigate('/earn')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Earn
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video Player */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={currentVideo?.video_url}
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnd}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {/* Play/Pause Overlay */}
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity cursor-pointer",
            isPlaying ? "opacity-0" : "opacity-100 bg-black/30"
          )}
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isPlaying ? (
              <Pause className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white ml-1" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0">
          <Progress value={progress} className="h-1 rounded-none bg-white/20" />
        </div>

        {/* Top Info Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/earn')}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/90 text-primary-foreground gap-1">
                <Coins className="w-3 h-3" />
                +{currentVideo?.points_reward} pts
              </Badge>
              {currentVideo?.partner_name && (
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
                  {currentVideo.partner_name}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => toast.info('Liked!')}
          >
            <Heart className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => toast.info('Share feature coming soon!')}
          >
            <Share2 className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </Button>
        </div>

        {/* Bottom Info */}
        <div className="absolute left-4 right-20 bottom-20 text-white">
          <h3 className="font-semibold text-lg mb-1 drop-shadow-lg">
            {currentVideo?.title}
          </h3>
          {currentVideo?.description && (
            <p className="text-sm text-white/80 line-clamp-2 drop-shadow-lg">
              {currentVideo.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
            <span className="capitalize">{currentVideo?.category}</span>
            <span>•</span>
            <span>{currentVideo?.view_count} views</span>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute left-1/2 transform -translate-x-1/2 top-20 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20",
              currentIndex === 0 && "opacity-30 pointer-events-none"
            )}
            onClick={goToPrev}
            disabled={currentIndex === 0}
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-36 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20",
              currentIndex === videos.length - 1 && "opacity-30 pointer-events-none"
            )}
            onClick={goToNext}
            disabled={currentIndex === videos.length - 1}
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        </div>

        {/* Claim Button / Watch Status */}
        <div className="absolute bottom-4 left-4 right-4 space-y-2">

          {isVideoWatched ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/20 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Already watched - {isVideoWatched.points_awarded} pts earned</span>
            </div>
          ) : canComplete ? (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleClaim}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Coins className="w-4 h-4" />
              )}
              Claim {currentVideo?.points_reward} Points
            </Button>
          ) : (
            <div className="text-center text-white/60 text-sm py-3">
              Watch {requiredWatchTime - watchTime}s more to earn {currentVideo?.points_reward} points
            </div>
          )}
        </div>

        {/* Video Counter */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-xs font-medium">
            {currentIndex + 1}/{videos.length}
          </div>
        </div>
      </div>
    </div>
  );
}
