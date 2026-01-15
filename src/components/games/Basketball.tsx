import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BasketballProps {
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
  visible: boolean;
  scored: boolean;
}

export function Basketball({ playsRemaining, onComplete, isPlaying, setIsPlaying }: BasketballProps) {
  const [ball, setBall] = useState<Ball>({ x: 150, y: 280, vx: 0, vy: 0, visible: false, scored: false });
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('basketball_high_score');
    return saved ? parseInt(saved) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [hoopX, setHoopX] = useState(150);
  const [hoopDirection, setHoopDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const hasCompletedRef = useRef(false);

  const CONTAINER_WIDTH = 300;
  const CONTAINER_HEIGHT = 350;
  const BALL_SIZE = 40;
  const HOOP_WIDTH = 55;
  const HOOP_Y = 70;
  const GRAVITY = 0.55; // Heavier gravity for more realistic arc
  const BALL_START_X = 150;
  const BALL_START_Y = 280;

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  const startGame = useCallback(() => {
    setBall({ x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, visible: false, scored: false });
    setScore(0);
    scoreRef.current = 0;
    setShots(0);
    setTimeLeft(30);
    setGameOver(false);
    gameOverRef.current = false;
    setEarnedPoints(0);
    setHoopX(150);
    setHoopDirection(1);
    hasCompletedRef.current = false;
    setIsPlaying(true);
  }, [setIsPlaying]);

  const endGame = useCallback((finalScore: number) => {
    if (gameOverRef.current || hasCompletedRef.current) return;
    
    hasCompletedRef.current = true;
    gameOverRef.current = true;
    setGameOver(true);
    setIsPlaying(false);
    
    // Calculate points - BALANCED (max 30 pts, average ~12 pts)
    // Target: 4 games × K1.20 (12 pts) = K4.80 (48 pts) daily
    let points = 0;
    if (finalScore >= 8) points = 30;
    else if (finalScore >= 6) points = 22;
    else if (finalScore >= 4) points = 15;
    else if (finalScore >= 3) points = 10;
    else if (finalScore >= 2) points = 6;
    else if (finalScore >= 1) points = 3;
    else points = 0;
    
    setEarnedPoints(points);
    
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('basketball_high_score', finalScore.toString());
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

  // Smooth hoop movement
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    
    const moveHoop = setInterval(() => {
      setHoopX(prev => {
        const speed = 1.5;
        let newX = prev + (speed * hoopDirection);
        
        if (newX >= CONTAINER_WIDTH - 60) {
          setHoopDirection(-1);
          newX = CONTAINER_WIDTH - 60;
        } else if (newX <= 60) {
          setHoopDirection(1);
          newX = 60;
        }
        
        return newX;
      });
    }, 50);
    
    return () => clearInterval(moveHoop);
  }, [isPlaying, gameOver, hoopDirection]);

  // Ball physics with improved scoring detection
  useEffect(() => {
    if (!ball.visible || gameOver) return;

    const gameLoop = () => {
      setBall(prev => {
        if (!prev.visible) return prev;
        
        let newVy = prev.vy + GRAVITY;
        let newY = prev.y + newVy;
        let newX = prev.x + prev.vx;
        
        // Improved hoop collision detection - larger scoring zone
        const hoopLeft = hoopX - HOOP_WIDTH / 2;
        const hoopRight = hoopX + HOOP_WIDTH / 2;
        const ballCenterX = newX;
        const ballRadius = BALL_SIZE / 2;
        
        // Ball scores if it passes through the hoop opening from above
        // Check: ball center is within hoop horizontally, passing through vertically, moving downward
        const isInHoopHorizontally = ballCenterX >= hoopLeft + 3 && ballCenterX <= hoopRight - 3;
        const isAtHoopLevel = prev.y <= HOOP_Y + 10 && newY >= HOOP_Y;
        const isMovingDown = prev.vy > 0;
        
        if (!prev.scored && isInHoopHorizontally && isAtHoopLevel && isMovingDown) {
          setScore(s => s + 1);
          scoreRef.current += 1;
          // Let ball continue through the net
          return { ...prev, y: newY, x: newX, vy: newVy * 0.7, scored: true };
        }
        
        // Rim collision - ball bounces off rim if it hits the edge
        const hitLeftRim = !prev.scored && ballCenterX >= hoopLeft - ballRadius && ballCenterX <= hoopLeft + 5 && newY >= HOOP_Y - 5 && newY <= HOOP_Y + 15;
        const hitRightRim = !prev.scored && ballCenterX >= hoopRight - 5 && ballCenterX <= hoopRight + ballRadius && newY >= HOOP_Y - 5 && newY <= HOOP_Y + 15;
        
        if (hitLeftRim) {
          return { ...prev, x: hoopLeft - ballRadius - 2, y: newY, vx: -Math.abs(prev.vx) * 0.5 - 1, vy: newVy * 0.6 };
        }
        if (hitRightRim) {
          return { ...prev, x: hoopRight + ballRadius + 2, y: newY, vx: Math.abs(prev.vx) * 0.5 + 1, vy: newVy * 0.6 };
        }
        
        // Ball goes off screen or hits ground
        if (newY > CONTAINER_HEIGHT + 50 || newX < -50 || newX > CONTAINER_WIDTH + 50) {
          return { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, visible: false, scored: false };
        }
        
        return { ...prev, x: newX, y: newY, vy: newVy };
      });
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ball.visible, gameOver, hoopX]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaying || gameOver || ball.visible) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    let x: number, y: number;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    // Only allow drag from ball area
    const distToBall = Math.sqrt(Math.pow(x - BALL_START_X, 2) + Math.pow(y - BALL_START_Y, 2));
    if (distToBall > 60) return;
    
    setDragStart({ x, y });
    setDragEnd({ x, y });
    setIsDragging(true);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    let x: number, y: number;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    setDragEnd({ x, y });
  };

  const handleDragEnd = () => {
    if (!isDragging || !isPlaying || gameOver) {
      setIsDragging(false);
      return;
    }
    
    setIsDragging(false);
    
    // Calculate velocity based on drag (swipe up and towards hoop)
    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.14, 14);
    
    // Only shoot if swiped upward with enough power
    if (power > 2 && dy > 10) {
      const angle = Math.atan2(dy, dx);
      const vx = Math.cos(angle) * power;
      const vy = Math.sin(angle) * power;
      
      // Better arc for more satisfying shots - aim towards hoop
      const aimAdjustment = (hoopX - BALL_START_X) * 0.015;
      
      setBall({
        x: BALL_START_X,
        y: BALL_START_Y,
        vx: -vx * 0.6 + aimAdjustment,
        vy: -Math.abs(vy) * 1.25, // Higher arc
        visible: true,
        scored: false,
      });
      setShots(s => s + 1);
    }
  };

  return (
    <Card className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <span className="text-2xl">🏀</span>
          Basketball
        </CardTitle>
        <CardDescription>
          {!isPlaying && !gameOver 
            ? `${playsRemaining} game${playsRemaining !== 1 ? 's' : ''} remaining today`
            : isPlaying 
              ? "Swipe up to shoot!"
              : earnedPoints > 0 
                ? `You earned ${earnedPoints} points!` 
                : "Game Over! Try to score more baskets."
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
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            className="relative bg-gradient-to-b from-indigo-900 to-indigo-700 rounded-xl overflow-hidden cursor-pointer select-none"
            style={{ 
              width: CONTAINER_WIDTH, 
              height: CONTAINER_HEIGHT,
              touchAction: 'none',
            }}
          >
            {/* Backboard */}
            <div 
              className="absolute bg-white border-4 border-gray-400 rounded transition-all duration-100"
              style={{
                left: hoopX - 35,
                top: 40,
                width: 70,
                height: 50,
              }}
            />
            
            {/* Hoop */}
            <div 
              className="absolute transition-all duration-100"
              style={{
                left: hoopX - HOOP_WIDTH / 2,
                top: HOOP_Y,
              }}
            >
              <div className="relative">
                <div className="w-[50px] h-3 border-4 border-orange-500 border-t-0 rounded-b-lg" />
                {/* Net */}
                <div className="absolute top-3 left-1 w-[46px] h-8 border-l-2 border-r-2 border-b-2 border-orange-300/50 rounded-b-lg" 
                     style={{ borderStyle: 'dashed' }} />
              </div>
            </div>
            
            {/* Ball */}
            {ball.visible && (
              <div
                className="absolute transition-none"
                style={{
                  left: ball.x - BALL_SIZE / 2,
                  top: ball.y - BALL_SIZE / 2,
                  width: BALL_SIZE,
                  height: BALL_SIZE,
                  transform: `rotate(${ball.x * 2}deg)`,
                }}
              >
                <span className="text-3xl select-none block">🏀</span>
              </div>
            )}
            
            {/* Starting ball position indicator */}
            {!ball.visible && isPlaying && (
              <div
                className="absolute"
                style={{
                  left: BALL_START_X - BALL_SIZE / 2,
                  top: BALL_START_Y - BALL_SIZE / 2,
                  width: BALL_SIZE,
                  height: BALL_SIZE,
                }}
              >
                <span className="text-3xl select-none block">🏀</span>
              </div>
            )}
            
            {/* Drag indicator */}
            {isDragging && (
              <svg className="absolute inset-0 pointer-events-none">
                <line
                  x1={BALL_START_X}
                  y1={BALL_START_Y}
                  x2={dragEnd.x}
                  y2={dragEnd.y}
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  opacity="0.7"
                />
                <circle cx={BALL_START_X} cy={BALL_START_Y} r="8" fill="white" opacity="0.5" />
              </svg>
            )}
            
            {/* Hint */}
            {!ball.visible && isPlaying && shots === 0 && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/80 text-sm animate-pulse text-center">
                👆 Drag & release to shoot!
              </div>
            )}
            
            {/* Score display */}
            {score > 0 && isPlaying && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-4xl font-bold text-white drop-shadow-lg">
                {score}
              </div>
            )}
            
            {/* Game over overlay */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold text-white mb-2">Game Over!</p>
                <p className="text-xl text-white">{score}/{shots} baskets</p>
                {earnedPoints > 0 && (
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
            <span className="text-6xl mb-4">🏀</span>
            <p className="text-muted-foreground text-center px-4">
              Drag from the ball and swipe up to shoot!<br/>
              You have 30 seconds.<br/>
              <span className="text-xs mt-2 block">Score 10+ for max points!</span>
            </p>
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