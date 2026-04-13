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
  const scoreElRef = useRef<HTMLDivElement>(null);
  const bigScoreElRef = useRef<HTMLDivElement>(null);

  const GRAVITY = 0.55;
  const BOUNCE_POWER = -11;
  const CONTAINER_WIDTH = 300;
  const CONTAINER_HEIGHT = 350;
  const BALL_SIZE = 55;
  const BALL_RADIUS = BALL_SIZE / 2;
  const AIR_RESISTANCE = 0.992;

  const startGame = useCallback(() => {
    const initialBall = { x: 150, y: 100, vx: (Math.random() - 0.5) * 2, vy: 0, rotation: 0 };
    ballRef.current = initialBall;
    scoreRef.current = 0;
    setScore(0);
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
    setScore(finalScore);
    setIsPlaying(false);
    
    let points = 0;
    if (finalScore >= 20) points = 10;
    else if (finalScore >= 15) points = 8;
    else if (finalScore >= 10) points = 6;
    else if (finalScore >= 5) points = 4;
    else if (finalScore >= 2) points = 2;
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

  const shouldEndGameRef = useRef(false);
  const ballElRef = useRef<HTMLDivElement>(null);

  // Game physics loop - pure ref-based, no state updates
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameLoop = () => {
      if (gameOverRef.current) return;
      
      if (shouldEndGameRef.current) {
        shouldEndGameRef.current = false;
        endGame(scoreRef.current);
        return;
      }
      
      const prev = ballRef.current;
      let newVy = prev.vy + GRAVITY;
      let newY = prev.y + newVy;
      let newX = prev.x + prev.vx;
      let newVx = prev.vx * AIR_RESISTANCE;
      let newRotation = prev.rotation + prev.vx * 4;
      
      newVy *= 0.998;
      
      if (newX < BALL_RADIUS) {
        newX = BALL_RADIUS;
        newVx = Math.abs(newVx) * 0.7;
      } else if (newX > CONTAINER_WIDTH - BALL_RADIUS) {
        newX = CONTAINER_WIDTH - BALL_RADIUS;
        newVx = -Math.abs(newVx) * 0.7;
      }
      
      if (newY < BALL_RADIUS + 10) {
        newY = BALL_RADIUS + 10;
        newVy = Math.abs(newVy) * 0.5;
      }
      
      if (newY > CONTAINER_HEIGHT - BALL_RADIUS - 16) {
        shouldEndGameRef.current = true;
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      ballRef.current = { x: newX, y: newY, vx: newVx, vy: newVy, rotation: newRotation };
      
      // Direct DOM update only - no React state
      if (ballElRef.current) {
        ballElRef.current.style.left = `${newX - BALL_RADIUS}px`;
        ballElRef.current.style.top = `${newY - BALL_RADIUS}px`;
        ballElRef.current.style.transform = `rotate(${newRotation}deg)`;
      }
      
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
    
    const currentBall = ballRef.current;
    const dx = tapX - currentBall.x;
    const dy = tapY - currentBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const hitboxRadius = BALL_RADIUS + 12;
    
    if (distance <= hitboxRadius && currentBall.y > 35) {
      const kickAngle = (tapX - currentBall.x) * 0.04;
      const kickPower = BOUNCE_POWER - (Math.random() * 2);
      
      // Update ball via ref only - no setBall
      ballRef.current = {
        ...currentBall,
        vy: kickPower,
        vx: currentBall.vx * 0.5 + kickAngle + (Math.random() - 0.5) * 0.8,
      };
      
      scoreRef.current += 1;
      
      // Update score DOM directly for zero-lag feedback
      if (scoreElRef.current) {
        scoreElRef.current.textContent = `Score: ${scoreRef.current}`;
      }
      if (bigScoreElRef.current) {
        bigScoreElRef.current.textContent = String(scoreRef.current);
      }
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
              <span ref={scoreElRef} className="text-xl font-bold text-primary">Score: {score}</span>
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
            
            {/* Ball */}
            <div
              ref={ballElRef}
              className="absolute will-change-transform pointer-events-none"
              style={{
                left: ballRef.current.x - BALL_RADIUS,
                top: ballRef.current.y - BALL_RADIUS,
                width: BALL_SIZE,
                height: BALL_SIZE,
                transform: `rotate(${ballRef.current.rotation}deg)`,
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
            
            {/* Score indicator - DOM ref updated */}
            {isPlaying && (
              <div ref={bigScoreElRef} className="absolute top-4 left-1/2 -translate-x-1/2 text-4xl font-bold text-white drop-shadow-lg">
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
              <span className="text-xs mt-2 block">Score 20+ for max points!</span>
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
