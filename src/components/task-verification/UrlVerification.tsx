import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Loader2, CheckCircle, Copy, ExternalLink, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface UrlVerificationProps {
  taskId: string;
  taskTitle?: string;
  taskDescription?: string;
  onComplete: (proofUrl: string) => void;
  onCancel: () => void;
}

// Get platform-specific guidance based on task
const getUrlGuidance = (taskTitle?: string, taskDescription?: string) => {
  const title = (taskTitle || "").toLowerCase();
  const desc = (taskDescription || "").toLowerCase();
  const combined = `${title} ${desc}`;

  if (combined.includes("twitter") || combined.includes("tweet") || combined.includes("x.com")) {
    return {
      platform: "Twitter/X",
      icon: "𝕏",
      placeholder: "https://x.com/username/status/...",
      examples: ["https://x.com/username/status/1234567890", "https://twitter.com/username/status/1234567890"],
      instructions: [
        "Open Twitter/X and find your post",
        "Click the share button (arrow icon) on your tweet",
        "Select 'Copy link' from the menu",
        "Paste the link in the field above",
      ],
    };
  }

  if (combined.includes("facebook") || combined.includes("fb")) {
    return {
      platform: "Facebook",
      icon: "f",
      placeholder: "https://facebook.com/...",
      examples: ["https://facebook.com/username/posts/1234567890", "https://fb.com/story.php?..."],
      instructions: [
        "Open Facebook and find your post",
        "Click the three dots (⋯) on your post",
        "Select 'Copy link' or 'Copy link to post'",
        "Paste the link in the field above",
      ],
    };
  }

  if (combined.includes("instagram") || combined.includes("ig")) {
    return {
      platform: "Instagram",
      icon: "📷",
      placeholder: "https://instagram.com/p/...",
      examples: ["https://instagram.com/p/ABC123xyz", "https://www.instagram.com/reel/..."],
      instructions: [
        "Open Instagram and find your post",
        "Tap the three dots (⋯) above the post",
        "Select 'Link' or 'Copy Link'",
        "Paste the link in the field above",
      ],
    };
  }

  if (combined.includes("tiktok")) {
    return {
      platform: "TikTok",
      icon: "🎵",
      placeholder: "https://tiktok.com/@username/video/...",
      examples: ["https://tiktok.com/@username/video/1234567890", "https://vm.tiktok.com/..."],
      instructions: [
        "Open TikTok and find your video",
        "Tap the 'Share' arrow button",
        "Select 'Copy link'",
        "Paste the link in the field above",
      ],
    };
  }

  if (combined.includes("youtube") || combined.includes("video")) {
    return {
      platform: "YouTube",
      icon: "▶️",
      placeholder: "https://youtube.com/watch?v=...",
      examples: ["https://youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ"],
      instructions: [
        "Open YouTube and find your video or comment",
        "Click 'Share' below the video",
        "Click 'Copy' to copy the link",
        "Paste the link in the field above",
      ],
    };
  }

  // Default generic guidance
  return {
    platform: "Website",
    icon: "🔗",
    placeholder: "https://example.com/your-proof-link",
    examples: ["https://example.com/order/12345", "https://app.example.com/profile/username"],
    instructions: [
      "Complete the task as instructed",
      "Navigate to the page that shows your completion",
      "Copy the URL from your browser's address bar",
      "Paste the link in the field above",
    ],
  };
};

export function UrlVerification({ 
  taskId,
  taskTitle,
  taskDescription,
  onComplete, 
  onCancel 
}: UrlVerificationProps) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const { toast } = useToast();

  const guidance = getUrlGuidance(taskTitle, taskDescription);

  const isValidUrl = (urlString: string) => {
    try {
      const parsed = new URL(urlString);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.trim()) {
      setIsValid(isValidUrl(value));
    } else {
      setIsValid(null);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUrlChange(text.trim());
        toast({
          title: "Link pasted",
          description: "URL pasted from clipboard",
        });
      }
    } catch {
      toast({
        title: "Paste failed",
        description: "Please paste manually using Ctrl+V or Cmd+V",
        variant: "destructive",
      });
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
    await new Promise(resolve => setTimeout(resolve, 500));
    onComplete(url);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-xl">
          {guidance.icon}
        </div>
        <h3 className="text-lg font-semibold">Submit Your Proof Link</h3>
        <p className="text-sm text-muted-foreground">
          Paste the link showing you completed the task
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="proof-url">Proof URL</Label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="proof-url"
            type="url"
            placeholder={guidance.placeholder}
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className={cn(
              "pl-10 pr-20",
              isValid === true && "border-green-500 focus-visible:ring-green-500",
              isValid === false && "border-destructive focus-visible:ring-destructive"
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
            onClick={handlePaste}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Paste
          </Button>
        </div>
        {isValid === true && (
          <p className="text-xs text-green-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Valid URL format
          </p>
        )}
        {isValid === false && (
          <p className="text-xs text-destructive">
            Please enter a valid URL (must start with http:// or https://)
          </p>
        )}
      </div>

      {/* Help Section */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="help" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="flex items-center gap-2 text-sm">
              <HelpCircle className="h-4 w-4" />
              How to get the link?
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Steps for {guidance.platform}:</p>
                <ol className="text-sm text-muted-foreground space-y-1.5">
                  {guidance.instructions.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-medium text-primary">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Example links:</p>
                <div className="space-y-1">
                  {guidance.examples.map((example, index) => (
                    <Card 
                      key={index} 
                      className="p-2 text-xs text-muted-foreground font-mono bg-muted/50 break-all"
                    >
                      {example}
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Quick tip */}
      <Card className="p-3 bg-primary/5 border-primary/20">
        <p className="text-xs text-muted-foreground">
          💡 <strong>Tip:</strong> After completing the task, the proof link is usually in your browser's address bar. Just copy and paste it here!
        </p>
      </Card>

      {/* Action Buttons */}
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
          disabled={!url.trim() || isValid === false || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Proof
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
