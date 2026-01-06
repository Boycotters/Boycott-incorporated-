import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Gift } from "lucide-react";

interface ScratchCardProps {
  playsRemaining: number;
  onReveal: (points: number) => void;
  isScratching: boolean;
}

const PRIZES = [
  { points: 10, emoji: "🪙", label: "10 Points", weight: 30 },
  { points: 20, emoji: "💰", label: "20 Points", weight: 25 },
  { points: 35, emoji: "💎", label: "35 Points", weight: 20 },
  { points: 50, emoji: "⭐", label: "50 Points", weight: 15 },
  { points: 100, emoji: "🏆", label: "100 Points!", weight: 8 },
  { points: 200, emoji: "👑", label: "JACKPOT!", weight: 2 },
];

export function ScratchCard({ playsRemaining, onReveal, isScratching }: ScratchCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [prize, setPrize] = useState<typeof PRIZES[0] | null>(null);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isScratched, setIsScratched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const selectPrize = () => {
    const totalWeight = PRIZES.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const p of PRIZES) {
      random -= p.weight;
      if (random <= 0) return p;
    }
    return PRIZES[0];
  };

  const startNewCard = () => {
    if (playsRemaining <= 0) return;
    
    const newPrize = selectPrize();
    setPrize(newPrize);
    setIsRevealed(false);
    setIsScratched(false);
    setScratchProgress(0);
    
    // Initialize scratch canvas
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Fill with scratch-off coating
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "hsl(var(--primary))");
      gradient.addColorStop(0.5, "hsl(280 65% 60%)");
      gradient.addColorStop(1, "hsl(var(--accent))");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add some texture/pattern
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add text
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SCRATCH HERE!", canvas.width / 2, canvas.height / 2);
    }, 50);
  };

  const handleMouseDown = () => setIsDrawing(true);
  const handleMouseUp = () => setIsDrawing(false);

  const scratch = (x: number, y: number) => {
    if (!isDrawing || isScratched) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = (x - rect.left) * (canvas.width / rect.width);
    const canvasY = (y - rect.top) * (canvas.height / rect.height);
    
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Calculate scratch progress
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let clearedPixels = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) clearedPixels++;
    }
    const progress = (clearedPixels / (imageData.data.length / 4)) * 100;
    setScratchProgress(progress);
    
    if (progress > 50 && !isRevealed) {
      setIsRevealed(true);
      setIsScratched(true);
      if (prize) {
        onReveal(prize.points);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => scratch(e.clientX, e.clientY);
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  return (
    <Card className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Scratch Card
        </CardTitle>
        <CardDescription>
          {playsRemaining > 0 
            ? isScratched
              ? `You won ${prize?.points} points!`
              : prize
                ? "Scratch to reveal your prize!"
                : `${playsRemaining} card${playsRemaining !== 1 ? 's' : ''} remaining today`
            : "Come back tomorrow for more cards!"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-6">
        {/* Scratch Card Area */}
        {prize ? (
          <div className="relative w-full max-w-[280px] aspect-[1.6/1] rounded-xl overflow-hidden border-2 border-border shadow-lg">
            {/* Prize beneath */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10">
              <span className="text-5xl mb-2">{prize.emoji}</span>
              <span className="text-2xl font-bold text-primary">{prize.label}</span>
            </div>
            
            {/* Scratch layer */}
            {!isScratched && (
              <canvas
                ref={canvasRef}
                width={280}
                height={175}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={() => setIsDrawing(true)}
                onTouchEnd={() => setIsDrawing(false)}
                onTouchMove={handleTouchMove}
              />
            )}
          </div>
        ) : (
          <div className="w-full max-w-[280px] aspect-[1.6/1] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/30">
            <Sparkles className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center">
              Get a new scratch card<br />to win points!
            </p>
          </div>
        )}

        {/* Result Display */}
        {isRevealed && prize && (
          <div className="text-center animate-bounce">
            <p className="text-lg font-bold text-primary">+{prize.points} Points!</p>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={startNewCard}
          disabled={playsRemaining <= 0 || (prize && !isScratched)}
          className="w-full max-w-xs"
          size="lg"
        >
          <Gift className="w-5 h-5 mr-2" />
          {prize && !isScratched 
            ? "Keep Scratching!" 
            : playsRemaining > 0 
              ? isScratched 
                ? "Get New Card" 
                : "Get Scratch Card"
              : "No Cards Left"
          }
        </Button>
      </CardContent>
    </Card>
  );
}
