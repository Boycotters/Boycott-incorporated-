import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UrlVerificationProps {
  taskId: string;
  onComplete: (proofUrl: string) => void;
  onCancel: () => void;
}

export function UrlVerification({ 
  taskId, 
  onComplete, 
  onCancel 
}: UrlVerificationProps) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    // Simulate brief validation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    onComplete(url);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Submit URL Proof</h3>
        <p className="text-sm text-muted-foreground">
          Paste the link showing you completed the task
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proof-url">Proof URL</Label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="proof-url"
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          E.g., your social media post, profile link, or purchase confirmation
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={!url.trim() || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Submit URL"
          )}
        </Button>
      </div>
    </div>
  );
}
