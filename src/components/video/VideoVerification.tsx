import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, VolumeX, Coins, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoVerificationProps {
  videoUrl: string;
  title: string;
  description?: string;
  durationSeconds: number;
  pointsReward: number;
  onComplete: (watchDuration: number) => void;
  onCancel: () => void;
}

export function VideoVerification({
  videoUrl,
  title,
  description,
  durationSeconds,
  pointsReward,
  onComplete,
  onCancel,
}: VideoVerificationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [watchTime, setWatchTime] = useState(0);
  const [canComplete, setCanComplete] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const requiredWatchTime = Math.floor(durationSeconds * 0.8);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || durationSeconds;
      setProgress((current / duration) * 100);
      setWatchTime(Math.floor(current));
      
      if (current >= requiredWatchTime && !canComplete) {
        setCanComplete(true);
      }
    }
  }, [durationSeconds, requiredWatchTime, canComplete]);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
    setCanComplete(true);
  }, []);

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

  useEffect(() => {
    // Auto-play on mount
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Video Container */}
      <div className="relative flex-1 bg-black rounded-xl overflow-hidden min-h-[300px]">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={videoUrl}
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
            "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity cursor-pointer",
            isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
          )}
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0">
          <Progress value={progress} className="h-1 rounded-none bg-white/20" />
        </div>

        {/* Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Points Badge */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-primary/90 text-white gap-1">
            <Coins className="w-3 h-3" />
            +{pointsReward} pts
          </Badge>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
        </div>

        {/* Progress Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{watchTime}s / {durationSeconds}s watched</span>
          </div>
          {canComplete ? (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ready to claim
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              Watch {requiredWatchTime - watchTime}s more
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={!canComplete}
            onClick={() => onComplete(watchTime)}
          >
            <Coins className="w-4 h-4" />
            Claim {pointsReward} Points
          </Button>
        </div>
      </div>
    </div>
  );
}
