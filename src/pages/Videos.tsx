import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Heart, 
  Share2, 
  ChevronUp, 
  ChevronDown,
  Coins,
  CheckCircle2,
  Clock,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  points_reward: number;
  category: string;
  source: 'admin' | 'partner' | 'ai';
  partner_name: string | null;
  view_count: number;
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
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [watchTime, setWatchTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch videos
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Video[];
    },
  });

  // Fetch user's watched videos
  const { data: watchedVideos = [] } = useQuery({
    queryKey: ['watched-videos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_video_views')
        .select('video_id, completed, points_awarded')
        .eq('user_id', user?.id);
      
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
      } else if (!result.already_completed) {
        toast.info(result.message);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const currentVideo = videos[currentIndex];
  const isVideoWatched = currentVideo 
    ? watchedVideos.some(v => v.video_id === currentVideo.id && v.completed)
    : false;

  // Handle video time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && currentVideo) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || currentVideo.duration_seconds;
      setProgress((current / duration) * 100);
      setWatchTime(Math.floor(current));
    }
  }, [currentVideo]);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    if (currentVideo && !isVideoWatched) {
      completeMutation.mutate({
        videoId: currentVideo.id,
        duration: currentVideo.duration_seconds,
      });
    }
    setIsPlaying(false);
  }, [currentVideo, isVideoWatched, completeMutation]);

  // Navigate videos
  const goToNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setWatchTime(0);
      setIsPlaying(true);
    }
  }, [currentIndex, videos.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setWatchTime(0);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  // Touch swipe handling
  const touchStartY = useRef(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Play/pause toggle
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

  // Mute toggle
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Auto-play when video changes
  useEffect(() => {
    if (videoRef.current && currentVideo) {
      videoRef.current.load();
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          // Autoplay blocked, user needs to interact
          setIsPlaying(false);
        });
      }
    }
  }, [currentIndex, currentVideo]);

  // Keyboard navigation
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Sparkles className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">No Videos Yet</h2>
        <p className="text-muted-foreground">Check back soon for new content!</p>
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
      <div className="relative w-full h-full" onClick={togglePlay}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={currentVideo?.video_url}
          poster={currentVideo?.thumbnail_url || undefined}
          playsInline
          loop={false}
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnd}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Play/Pause Overlay */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity",
          isPlaying ? "opacity-0" : "opacity-100"
        )}>
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isPlaying ? (
              <Pause className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white ml-1" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0">
          <Progress value={progress} className="h-1 rounded-none bg-white/20" />
        </div>

        {/* Top Info Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isVideoWatched ? (
              <Badge variant="secondary" className="bg-green-500/90 text-white gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Watched
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-primary/90 text-white gap-1">
                <Coins className="w-3 h-3" />
                +{currentVideo?.points_reward} pts
              </Badge>
            )}
            {currentVideo?.source === 'partner' && currentVideo.partner_name && (
              <Badge variant="outline" className="bg-black/40 text-white border-white/30">
                {currentVideo.partner_name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-black/40 text-white gap-1">
              <Clock className="w-3 h-3" />
              {watchTime}s / {currentVideo?.duration_seconds}s
            </Badge>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60"
            onClick={(e) => {
              e.stopPropagation();
              toast.info("Liked!");
            }}
          >
            <Heart className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60"
            onClick={(e) => {
              e.stopPropagation();
              navigator.share?.({ 
                title: currentVideo?.title,
                url: window.location.href 
              }).catch(() => {
                toast.info("Share link copied!");
              });
            }}
          >
            <Share2 className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-black/40 text-white hover:bg-black/60"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </Button>
        </div>

        {/* Bottom Info */}
        <div className="absolute left-4 right-20 bottom-24 text-white">
          <h3 className="text-lg font-bold mb-1 drop-shadow-lg">{currentVideo?.title}</h3>
          {currentVideo?.description && (
            <p className="text-sm text-white/80 line-clamp-2 drop-shadow-lg">
              {currentVideo.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant="secondary" 
              className="bg-black/40 text-white capitalize"
            >
              {currentVideo?.category}
            </Badge>
            <span className="text-xs text-white/60">
              {currentVideo?.view_count.toLocaleString()} views
            </span>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-10 h-10 rounded-full bg-black/40 text-white",
              currentIndex === 0 && "opacity-30 pointer-events-none"
            )}
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            disabled={currentIndex === 0}
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-10 h-10 rounded-full bg-black/40 text-white",
              currentIndex === videos.length - 1 && "opacity-30 pointer-events-none"
            )}
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            disabled={currentIndex === videos.length - 1}
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        </div>

        {/* Video Counter */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-1">
            {videos.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-1 rounded-full transition-all",
                  idx === currentIndex 
                    ? "h-6 bg-primary" 
                    : "h-2 bg-white/40"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
