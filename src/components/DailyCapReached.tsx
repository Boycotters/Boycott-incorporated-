import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  earned?: number;
  cap?: number;
  showBack?: boolean;
}

export function DailyCapReached({ earned = 0, cap = 0, showBack = true }: Props) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-24">
      <Card className="max-w-md w-full bg-gradient-card border border-border rounded-2xl">
        <CardContent className="p-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Daily Cap Reached 🎉</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You've earned all available points for today
              {cap ? ` (${earned}/${cap} pts)` : ""}. Tasks, surveys, videos & games unlock again at midnight.
            </p>
          </div>
          {showBack && (
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
