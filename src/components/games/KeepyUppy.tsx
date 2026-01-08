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
  rotation: number;
}

export function KeepyUppy({ playsRemaining, onComplete, isPlaying, setIsPlaying }: KeepyUppyProps) {
  const [ball, setBall] = useState<Ball>({ x: 150, y: 100, vx: 0, vy: 0, rotation: 0 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('keepy_uppy_high_score');
    return saved ? parseInt(saved) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const ballRef = useRef<Ball>({ x: 150, y: 100, vx: 0, vy: 0, rotation: 0 });
  const lastTapRef = useRef(0);
  const hasCompletedRef = useRef(false);

  const GRAVITY = 0.35;
  const BOUNCE_POWER = -9;
  const CONTAINER_WIDTH = 300;
  const CONTAINER_HEIGHT = 350;
  const BALL_SIZE = 50;
  const BALL_RADIUS = BALL_SIZE / 2;

  // Keep scoreRef in sync
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    ballRef.current = ball;
  }, [ball]);

  const startGame = useCallback(() => {
    const initialBall = { x: 150, y: 100, vx: (Math.random() - 0.5) * 2, vy: 0, rotation: 0 };
    setBall(initialBall);
    ballRef.current = initialBall;
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(30);
    setGameOver(false);
    gameOverRef.current = false;
    setEarnedPoints(0);
    lastTapRef.current = 0;
    hasCompletedRef.current = false;
    setIsPlaying(true);
  }, [setIsPlaying]);

  const endGame = useCallback((finalScore: number) => {
    if (gameOverRef.current || hasCompletedRef.current) return;
    
    hasCompletedRef.current = true;
    gameOverRef.current = true;
    setGameOver(true);
    setIsPlaying(false);
    
    // Calculate points based on score - challenging thresholds
    let points = 0;
    if (finalScore >= 50) points = 100;
    else if (finalScore >= 35) points = 75;
    else if (finalScore >= 25) points = 50;
    else if (finalScore >= 15) points = 30;
    else if (finalScore >= 8) points = 15;
    else if (finalScore >= 3) points = 5;
    else points = 0;
    
    setEarnedPoints(points);
    
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('keepy_uppy_high_score', finalScore.toString());
    }
    
    if (points > 0) {
      onComplete(points, finalScore);
    }
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
      endGame(scoreRef.current);
    }
  }, [timeLeft, isPlaying, gameOver, endGame]);

  // Game physics loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameLoop = () => {
      if (gameOverRef.current) return;
      
      setBall(prev => {
        let newVy = prev.vy + GRAVITY;
        let newY = prev.y + newVy;
        let newX = prev.x + prev.vx;
        let newVx = prev.vx * 0.995; // Slight air resistance
        let newRotation = prev.rotation + prev.vx * 3;
        
        // Bounce off walls
        if (newX < BALL_RADIUS) {
          newX = BALL_RADIUS;
          newVx = Math.abs(newVx) * 0.8;
        } else if (newX > CONTAINER_WIDTH - BALL_RADIUS) {
          newX = CONTAINER_WIDTH - BALL_RADIUS;
          newVx = -Math.abs(newVx) * 0.8;
        }
        
        // Check if ball hit the ground
        if (newY > CONTAINER_HEIGHT - BALL_RADIUS - 16) {
          endGame(scoreRef.current);
          return prev;
        }
        
        const newBall = { x: newX, y: newY, vx: newVx, vy: newVy, rotation: newRotation };
        ballRef.current = newBall;
        return newBall;
      });
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, gameOver, endGame]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaying || gameOverRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Strict debounce (minimum 150ms between taps)
    const now = Date.now();
    if (now - lastTapRef.current < 150) return;
    lastTapRef.current = now;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    let tapX: number;
    let tapY: number;
    
    if ('touches' in e) {
      tapX = e.touches[0].clientX - rect.left;
      tapY = e.touches[0].clientY - rect.top;
    } else {
      tapX = e.clientX - rect.left;
      tapY = e.clientY - rect.top;
    }
    
    // Use ref for current ball position (more accurate)
    const currentBall = ballRef.current;
    
    // Calculate distance from tap to ball center
    const dx = tapX - currentBall.x;
    const dy = tapY - currentBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // STRICT: Must tap within actual ball radius + small tolerance
    const hitboxRadius = BALL_RADIUS + 10;
    
    // Ball must be falling (vy > 0) or at least visible, and not too high
    if (distance <= hitboxRadius && currentBall.y > 40) {
      // Apply upward force
      setBall(prev => ({
        ...prev,
        vy: BOUNCE_POWER + (Math.random() * 1.5 - 0.75),
        vx: prev.vx + (tapX - prev.x) * 0.03,
      }));
      
      // Increment score ONCE
      setScore(prev => prev + 1);
    }
  }, [isPlaying]);

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
                : "Game Over! Need at least 3 kicks."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-6">
        {isPlaying && !gameOver && (
          <>
            <div className="flex items-center justify-between w-full max-w-[300px] text-sm">
              <span className={timeLeft <= 5 ? "text-destructive font-bold animate-pulse" : ""}>
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
            className="relative bg-gradient-to-b from-sky-400 to-sky-200 dark:from-sky-800 dark:to-sky-600 rounded-xl overflow-hidden cursor-pointer select-none"
            style={{ 
              width: CONTAINER_WIDTH, 
              height: CONTAINER_HEIGHT,
              touchAction: 'none',
            }}
          >
            {/* Clouds */}
            <div className="absolute top-4 left-8 text-3xl opacity-50">☁️</div>
            <div className="absolute top-12 right-6 text-2xl opacity-40">☁️</div>
            
            {/* Ground */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-green-600 to-green-500" />
            
            {/* Ball with visible hitbox indicator */}
            <div
              className="absolute transition-none pointer-events-none"
              style={{
                left: ball.x - BALL_RADIUS,
                top: ball.y - BALL_RADIUS,
                width: BALL_SIZE,
                height: BALL_SIZE,
                transform: `rotate(${ball.rotation}deg)`,
              }}
            >
              <span className="text-5xl select-none block">⚽</span>
            </div>
            
            {/* Tap hint */}
            {isPlaying && score === 0 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/80 text-sm animate-pulse text-center">
                👆 Tap the ball!
              </div>
            )}
            
            {/* Score indicator */}
            {score > 0 && isPlaying && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-4xl font-bold text-white drop-shadow-lg">
                {score}
              </div>
            )}
            
            {/* Game over overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold text-white mb-2">Game Over!</p>
                <p className="text-xl text-white">Score: {score}</p>
                {score >= 3 && earnedPoints > 0 && (
                  <p className="text-lg text-primary mt-2">+{earnedPoints} Points!</p>
                )}
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
              You have 30 seconds.<br/>
              <span className="text-xs mt-2 block">Score 50+ for max points!</span>
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
