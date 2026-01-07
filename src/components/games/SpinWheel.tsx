import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RotateCw, Sparkles } from "lucide-react";

interface SpinWheelProps {
  playsRemaining: number;
  onSpin: (points: number) => void;
  isSpinning: boolean;
}

const WHEEL_SEGMENTS = [
  { points: 5, color: "hsl(var(--muted))", label: "5", weight: 25 },
  { points: 10, color: "hsl(var(--primary))", label: "10", weight: 20 },
  { points: 15, color: "hsl(var(--secondary))", label: "15", weight: 18 },
  { points: 20, color: "hsl(var(--accent))", label: "20", weight: 15 },
  { points: 30, color: "hsl(160 84% 39%)", label: "30", weight: 10 },
  { points: 50, color: "hsl(280 65% 60%)", label: "50", weight: 7 },
  { points: 75, color: "hsl(340 82% 52%)", label: "75", weight: 4 },
  { points: 100, color: "hsl(48 96% 53%)", label: "100", weight: 1 },
];

// Weighted random selection - harder to get big prizes
function selectWeightedSegment(): number {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    random -= WHEEL_SEGMENTS[i].weight;
    if (random <= 0) return i;
  }
  return 0;
}

export function SpinWheel({ playsRemaining, onSpin, isSpinning }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = useCallback(() => {
    if (playsRemaining <= 0 || isSpinning || spinning) return;

    setResult(null);
    setSpinning(true);
    
    // Weighted random segment selection
    const segmentIndex = selectWeightedSegment();
    const segment = WHEEL_SEGMENTS[segmentIndex];
    
    // Calculate rotation (6-10 full spins + landing position for smooth animation)
    const spins = 6 + Math.random() * 4;
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    // Pointer is at top (0 degrees), we need to land segment under pointer
    const landingAngle = segmentIndex * segmentAngle + segmentAngle / 2;
    const totalRotation = spins * 360 + (360 - landingAngle);
    
    setRotation(prev => prev + totalRotation);
    
    // Delay result display until spin completes (match animation duration)
    setTimeout(() => {
      setResult(segment.points);
      setSpinning(false);
      onSpin(segment.points);
    }, 5000);
  }, [playsRemaining, isSpinning, spinning, onSpin]);

  const segmentAngle = 360 / WHEEL_SEGMENTS.length;

  return (
    <Card className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Spin the Wheel
        </CardTitle>
        <CardDescription>
          {playsRemaining > 0 
            ? `${playsRemaining} spin${playsRemaining !== 1 ? 's' : ''} remaining today`
            : "Come back tomorrow for more spins!"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-6">
        {/* Wheel Container */}
        <div className="relative w-64 h-64">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
          </div>
          
          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full border-4 border-border shadow-xl overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {WHEEL_SEGMENTS.map((segment, i) => {
                const startAngle = i * segmentAngle - 90;
                const endAngle = startAngle + segmentAngle;
                
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                
                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);
                
                const largeArc = segmentAngle > 180 ? 1 : 0;
                
                const midAngle = startAngle + segmentAngle / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const textX = 50 + 32 * Math.cos(midRad);
                const textY = 50 + 32 * Math.sin(midRad);
                
                return (
                  <g key={i}>
                    <path
                      d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                      stroke="hsl(var(--background))"
                      strokeWidth="0.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        transform: `rotate(${midAngle + 90}deg)`,
                        transformOrigin: `${textX}px ${textY}px`,
                        textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                      }}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="50" cy="50" r="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
              <circle cx="50" cy="50" r="4" fill="hsl(var(--primary))" />
            </svg>
          </div>
          
          {/* Glow effect during spin */}
          {spinning && (
            <div className="absolute inset-0 rounded-full animate-pulse bg-primary/20 blur-xl pointer-events-none" />
          )}
        </div>

        {/* Result Display */}
        {result !== null && !spinning && (
          <div className="text-center animate-bounce">
            <p className="text-2xl font-bold text-primary">+{result} Points!</p>
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={playsRemaining <= 0 || isSpinning || spinning}
          className="w-full max-w-xs"
          size="lg"
        >
          <RotateCw className={`w-5 h-5 mr-2 ${spinning ? "animate-spin" : ""}`} />
          {spinning ? "Spinning..." : playsRemaining > 0 ? "Spin Now!" : "No Spins Left"}
        </Button>
      </CardContent>
    </Card>
  );
}
