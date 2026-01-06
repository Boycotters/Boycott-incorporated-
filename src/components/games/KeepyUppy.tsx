import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface KeepyUppyProps {
  playsRemaining: number;
  onComplete: (points: number, score: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function KeepyUppy({ playsRemaining, onComplete, isPlaying, setIsPlaying }: KeepyUppyProps) {
  const [ball, setBall] = useState<Ball>({ x: 150, y: 100, vx: 0, vy: 0 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const GRAVITY = 0.3;
  const BOUNCE_POWER = -8;
  const CONTAINER_WIDTH = 300;
  const CONTAINER_HEIGHT = 350;
  const BALL_SIZE = 50;

  const startGame = useCallback(() => {
    setBall({ x: 150, y: 100, vx: (Math.random() - 0.5) * 2, vy: 0 });
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setEarnedPoints(0);
    setIsPlaying(true);
  }, [setIsPlaying]);

  const endGame = useCallback((finalScore: number) => {
    setGameOver(true);
    setIsPlaying(false);
    
    // Calculate points based on score
    let points = 0;
    if (finalScore >= 50) points = 100;
    else if (finalScore >= 30) points = 60;
    else if (finalScore >= 20) points = 40;
    else if (finalScore >= 10) points = 25;
    else if (finalScore >= 5) points = 15;
    else points = Math.max(finalScore, 5);
    
    setEarnedPoints(points);
    
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
    
    onComplete(points, finalScore);
  }, [highScore, onComplete, setIsPlaying]);

  // Timer
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPlaying, gameOver]);

  // End game when time runs out
  useEffect(() => {
    if (timeLeft === 0 && isPlaying && !gameOver) {
      endGame(score);
    }
  }, [timeLeft, isPlaying, gameOver, score, endGame]);

  // Game physics loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameLoop = () => {
      setBall(prev => {
        let newVy = prev.vy + GRAVITY;
        let newY = prev.y + newVy;
        let newX = prev.x + prev.vx;
        let newVx = prev.vx * 0.99; // Air resistance
        
        // Bounce off walls
        if (newX < BALL_SIZE / 2) {
          newX = BALL_SIZE / 2;
          newVx = Math.abs(newVx) * 0.8;
        } else if (newX > CONTAINER_WIDTH - BALL_SIZE / 2) {
          newX = CONTAINER_WIDTH - BALL_SIZE / 2;
          newVx = -Math.abs(newVx) * 0.8;
        }
        
        // Check if ball hit the ground
        if (newY > CONTAINER_HEIGHT - BALL_SIZE / 2) {
          endGame(score);
          return prev;
        }
        
        return { x: newX, y: newY, vx: newVx, vy: newVy };
      });
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, gameOver, score, endGame]);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaying || gameOver) return;
    
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    let tapX: number;
    
    if ('touches' in e) {
      tapX = e.touches[0].clientX - rect.left;
    } else {
      tapX = e.clientX - rect.left;
    }
    
    // Check if tap is near the ball (generous hitbox)
    const distance = Math.abs(tapX - ball.x);
    const verticalDistance = Math.abs(ball.y - (CONTAINER_HEIGHT - 100)); // Tap zone in lower area
    
    if (distance < 80 && ball.y > 100) { // Can tap when ball is lower
      // Apply upward force
      setBall(prev => ({
        ...prev,
        vy: BOUNCE_POWER,
        vx: (tapX - prev.x) * 0.05, // Slight horizontal movement based on tap position
      }));
      
      setScore(prev => prev + 1);
    }
  };

  return (
    <Card className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <span className="text-2xl">⚽</span>
          Keepy Uppy
        </CardTitle>
        <CardDescription>
          {!isPlaying && !gameOver 
            ? `${playsRemaining} game${playsRemaining !== 1 ? 's' : ''} remaining today`
            : isPlaying 
              ? "Tap the ball to keep it up!"
              : earnedPoints > 0 
                ? `You earned ${earnedPoints} points!` 
                : "Game Over!"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-6">
        {isPlaying && !gameOver && (
          <>
            {/* Stats Bar */}
            <div className="flex items-center justify-between w-full max-w-[300px] text-sm">
              <span className={timeLeft <= 5 ? "text-destructive font-bold" : ""}>
                ⏱️ {timeLeft}s
              </span>
              <span className="text-xl font-bold text-primary">Score: {score}</span>
              <span className="text-muted-foreground">
                <Trophy className="w-4 h-4 inline mr-1" />
                {highScore}
              </span>
            </div>
            <Progress value={(timeLeft / 30) * 100} className="h-2 w-full max-w-[300px]" />
          </>
        )}

        {/* Game Area */}
        {isPlaying || gameOver ? (
          <div
            ref={containerRef}
            onClick={handleTap}
            onTouchStart={handleTap}
            className="relative bg-gradient-to-b from-sky-400 to-sky-200 dark:from-sky-800 dark:to-sky-600 rounded-xl overflow-hidden cursor-pointer touch-none"
            style={{ width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }}
          >
            {/* Ground */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-green-500 to-green-400" />
            
            {/* Ball */}
            <div
              className="absolute transition-none"
              style={{
                left: ball.x - BALL_SIZE / 2,
                top: ball.y - BALL_SIZE / 2,
                width: BALL_SIZE,
                height: BALL_SIZE,
              }}
            >
              <span className="text-5xl select-none">⚽</span>
            </div>
            
            {/* Score indicator */}
            {score > 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-4xl font-bold text-white drop-shadow-lg">
                {score}
              </div>
            )}
            
            {/* Game over overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold text-white mb-2">Game Over!</p>
                <p className="text-xl text-white">Score: {score}</p>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center rounded-xl bg-muted/30 border-2 border-dashed border-border"
            style={{ width: CONTAINER_WIDTH, height: CONTAINER_HEIGHT }}
          >
            <span className="text-6xl mb-4">⚽</span>
            <p className="text-muted-foreground text-center px-4">
              Keep the ball in the air by tapping it!<br/>
              You have 30 seconds.
            </p>
          </div>
        )}

        {/* Results */}
        {gameOver && earnedPoints > 0 && (
          <div className="text-center">
            <p className="text-lg font-bold text-primary">+{earnedPoints} Points!</p>
            <p className="text-sm text-muted-foreground">{score} kicks in 30 seconds</p>
          </div>
        )}

        {/* Start Button */}
        {!isPlaying && (
          <Button
            onClick={startGame}
            disabled={playsRemaining <= 0}
            className="w-full max-w-xs"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            {gameOver 
              ? playsRemaining > 0 ? "Play Again" : "No Games Left"
              : playsRemaining > 0 ? "Start Game" : "No Games Left"
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
