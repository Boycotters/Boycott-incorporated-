import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, RotateCcw, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MemoryMatchProps {
  playsRemaining: number;
  onComplete: (points: number, score: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

const CARD_EMOJIS = ["⚽", "🏀", "🎾", "🏈", "⚾", "🏐", "🎱", "🏓"];

interface GameCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export function MemoryMatch({ playsRemaining, onComplete, isPlaying, setIsPlaying }: MemoryMatchProps) {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const initializeGame = useCallback(() => {
    const shuffledEmojis = [...CARD_EMOJIS, ...CARD_EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    
    setCards(shuffledEmojis);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setTimeLeft(60);
    setGameOver(false);
    setEarnedPoints(0);
    setIsPlaying(true);
  }, [setIsPlaying]);

  // Timer
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPlaying, gameOver]);

  const endGame = (won: boolean) => {
    setGameOver(true);
    setIsPlaying(false);
    
    // Calculate points - Max 10 pts per game
    // Target: 4 games × 10 pts = 40 pts daily for games
    let points = 0;
    if (won) {
      points = 8;
      if (moves <= 16) points = 10;
      else if (moves <= 20) points = 9;
    } else {
      points = Math.min(matchedPairs, 5);
    }
    
    setEarnedPoints(points);
    if (points > 0) {
      onComplete(points, moves);
    }
  };

  const handleCardClick = (cardId: number) => {
    if (!isPlaying || gameOver || flippedCards.length >= 2) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));
    
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      
      const [first, second] = newFlipped;
      const firstCard = cards.find(c => c.id === first);
      const secondCard = cards.find(c => c.id === second);
      
      if (firstCard?.emoji === secondCard?.emoji) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second 
              ? { ...c, isMatched: true } 
              : c
          ));
          setMatchedPairs(prev => {
            const newPairs = prev + 1;
            if (newPairs === 8) {
              setTimeout(() => endGame(true), 300);
            }
            return newPairs;
          });
          setFlippedCards([]);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second 
              ? { ...c, isFlipped: false } 
              : c
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <Card className="bg-gradient-card border border-border rounded-2xl overflow-hidden">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Memory Match
        </CardTitle>
        <CardDescription>
          {!isPlaying && !gameOver 
            ? `${playsRemaining} game${playsRemaining !== 1 ? 's' : ''} remaining today`
            : isPlaying 
              ? "Match all pairs before time runs out!"
              : earnedPoints > 0 
                ? `You earned ${earnedPoints} points!` 
                : "Better luck next time!"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {isPlaying && !gameOver && (
          <>
            {/* Stats Bar */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={timeLeft <= 10 ? "text-destructive font-bold" : ""}>
                  {timeLeft}s
                </span>
              </div>
              <span>Moves: {moves}</span>
              <span>Pairs: {matchedPairs}/8</span>
            </div>
            <Progress value={(matchedPairs / 8) * 100} className="h-2" />
          </>
        )}

        {/* Game Board or Start Screen */}
        {isPlaying || gameOver ? (
          <div className="grid grid-cols-4 gap-2">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={!isPlaying || card.isMatched || card.isFlipped}
                className={`
                  aspect-square rounded-lg text-2xl font-bold
                  transition-all duration-300 transform
                  ${card.isFlipped || card.isMatched
                    ? "bg-primary/20 rotate-0 scale-100"
                    : "bg-gradient-to-br from-primary to-primary/70 rotate-0 scale-100 hover:scale-105"
                  }
                  ${card.isMatched ? "opacity-50" : ""}
                  ${!isPlaying ? "cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {card.isFlipped || card.isMatched ? card.emoji : "?"}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🧠</div>
            <p className="text-muted-foreground mb-4">
              Match 8 pairs of cards within 60 seconds!
            </p>
          </div>
        )}

        {/* Game Over Result */}
        {gameOver && (
          <div className="text-center py-4">
            <p className="text-xl font-bold">
              {matchedPairs === 8 ? "🎉 You Won!" : "⏰ Time's Up!"}
            </p>
            <p className="text-muted-foreground">
              {moves} moves • {matchedPairs} pairs matched
            </p>
            {earnedPoints > 0 && (
              <p className="text-lg font-bold text-primary mt-2">+{earnedPoints} Points!</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isPlaying && (
          <Button
            onClick={initializeGame}
            disabled={playsRemaining <= 0}
            className="w-full"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            {gameOver 
              ? playsRemaining > 0 
                ? "Play Again" 
                : "No Games Left"
              : playsRemaining > 0 
                ? "Start Game" 
                : "No Games Left"
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
