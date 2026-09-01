import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, CheckCircle2, Clock, Loader2, XCircle, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ArticleQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Article {
  title: string;
  summary: string;
  readMinutes: number;
  paragraphs: string[];
  keyTakeaways?: string[];
  questions: ArticleQuestion[];
}

interface ArticleVerificationProps {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  taskCategory?: string;
  onComplete: () => void;
  onCancel: () => void;
}

const FALLBACK_ARTICLE = (topic: string): Article => ({
  title: topic,
  summary: "A quick practical read on making your money and time work harder in Zambia.",
  readMinutes: 3,
  paragraphs: [
    "Earning online in Zambia works best when you treat it like a routine, not a lottery. The people who cash out consistently are the ones who show up at the same time each day, finish what they start, and keep their account details clean and verified. Consistency beats intensity every single time.",
    "Start by protecting your account. Use a password you do not reuse anywhere else, verify your phone number, and never share a one-time code with anyone — not even someone claiming to be support. Support will never ask for your OTP or your password. If a message creates panic and urgency, that is the biggest red flag of all.",
    "Next, budget your time. A focused thirty minutes spread across reading, surveys and short tasks usually pays better than an hour of scrolling. Daily caps exist so the reward pool stays sustainable, so once you have hit the cap, stop and come back tomorrow rather than burning time on locked activities.",
    "Finally, plan your cash-out. Points convert to kwacha at a fixed rate, and withdrawals go to mobile money. Complete identity verification early so that when you finally reach the threshold, nothing stands between you and your money. Keep the mobile money name matching your verified identity to avoid failed payouts.",
  ],
  keyTakeaways: [
    "Consistency pays more than one-off bursts",
    "Never share an OTP or password with anyone",
    "Verify identity early so payouts are not delayed",
  ],
  questions: [
    {
      id: "q1",
      question: "According to the article, what beats intensity when earning online?",
      options: ["Luck", "Consistency", "Referrals", "Bigger devices"],
      correctAnswer: 1,
    },
    {
      id: "q2",
      question: "What should you never share, even with someone claiming to be support?",
      options: ["Your name", "Your city", "Your OTP or password", "Your points balance"],
      correctAnswer: 2,
    },
    {
      id: "q3",
      question: "Why should you complete identity verification early?",
      options: [
        "To earn double points",
        "So nothing delays your payout when you reach the threshold",
        "To skip the daily cap",
        "To unlock games",
      ],
      correctAnswer: 1,
    },
  ],
});

export function ArticleVerification({
  taskId,
  taskTitle,
  taskDescription,
  taskCategory,
  onComplete,
  onCancel,
}: ArticleVerificationProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [secondsRead, setSecondsRead] = useState(0);
  const [phase, setPhase] = useState<"reading" | "quiz" | "result">("reading");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState(0);
  const [passed, setPassed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const requiredSeconds = useMemo(() => {
    if (!article) return 45;
    const words = article.paragraphs.join(" ").split(/\s+/).length;
    // ~220 words per minute, floor 40s, ceiling 180s
    return Math.min(180, Math.max(40, Math.round((words / 220) * 60)));
  }, [article]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getUser();
        const { data, error } = await supabase.functions.invoke("ai-service", {
          body: {
            action: "generate_article",
            data: { topic: taskTitle, category: taskCategory, brief: taskDescription },
            userId: session?.user?.id,
          },
        });
        if (error) throw error;
        const result = (data as any)?.data as Article | undefined;
        if (!cancelled && result?.paragraphs?.length && result?.questions?.length) {
          setArticle(result);
        } else if (!cancelled) {
          setArticle(FALLBACK_ARTICLE(taskTitle));
        }
      } catch {
        if (!cancelled) setArticle(FALLBACK_ARTICLE(taskTitle));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, taskTitle, taskCategory, taskDescription]);

  useEffect(() => {
    if (phase !== "reading" || loading) return;
    const t = setInterval(() => setSecondsRead((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, loading]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
  };

  const timeProgress = Math.min(100, (secondsRead / requiredSeconds) * 100);
  const canTakeQuiz = scrolledToEnd && secondsRead >= requiredSeconds;

  const submitQuiz = () => {
    if (!article) return;
    const total = article.questions.length;
    const correct = article.questions.filter((q) => answers[q.id] === q.correctAnswer).length;
    const pct = (correct / total) * 100;
    const didPass = pct >= 67;
    setAttempts((a) => a + 1);
    setPassed(didPass);
    setPhase("result");
    if (didPass) {
      toast.success(`Nice reading! ${correct}/${total} correct`);
    } else {
      toast.error(`${correct}/${total} correct — you need at least 2 out of 3`);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing your article…</p>
      </div>
    );
  }

  if (!article) return null;

  if (phase === "result") {
    return (
      <div className="space-y-4 py-2 text-center">
        {passed ? (
          <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
        ) : (
          <XCircle className="w-14 h-14 mx-auto text-destructive" />
        )}
        <div>
          <p className="font-semibold">{passed ? "Comprehension verified" : "Not quite"}</p>
          <p className="text-sm text-muted-foreground">
            {passed
              ? "You read it and proved it. Points incoming."
              : attempts >= 2
              ? "Try this task again later with a fresh article."
              : "Re-read the article and try the questions again."}
          </p>
        </div>
        <div className="flex gap-2">
          {passed ? (
            <Button className="flex-1" onClick={onComplete}>
              Claim points
            </Button>
          ) : attempts >= 2 ? (
            <Button className="flex-1" variant="outline" onClick={onCancel}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setAnswers({});
                  setPhase("reading");
                  setScrolledToEnd(false);
                  setSecondsRead(Math.floor(requiredSeconds / 2));
                }}
              >
                Re-read
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const allAnswered = article.questions.every((q) => answers[q.id] !== undefined);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Comprehension check</Badge>
          <span className="text-xs text-muted-foreground">Pass with 2 of 3</span>
        </div>
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {article.questions.map((q, i) => (
            <Card key={q.id} className="p-3 rounded-xl">
              <p className="text-sm font-medium mb-2">
                {i + 1}. {q.question}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                    className={cn(
                      "w-full text-left text-sm rounded-lg border px-3 py-2 transition-colors",
                      answers[q.id] === idx
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setPhase("reading")}>
            Back to article
          </Button>
          <Button className="flex-1" disabled={!allAnswered} onClick={submitQuiz}>
            Submit answers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="w-4 h-4 text-primary" />
        <span>{article.readMinutes || 3} min read</span>
        <span>•</span>
        <Clock className="w-3.5 h-3.5" />
        <span>
          {Math.min(secondsRead, requiredSeconds)}s / {requiredSeconds}s
        </span>
      </div>
      <Progress value={timeProgress} className="h-1.5" />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[45vh] overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <h3 className="font-semibold leading-snug">{article.title}</h3>
        <p className="text-xs text-muted-foreground italic">{article.summary}</p>
        {article.paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-foreground/90">
            {p}
          </p>
        ))}
        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
          <Card className="p-3 rounded-lg bg-primary/5 border-primary/20">
            <p className="text-xs font-medium mb-1">Key takeaways</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {article.keyTakeaways.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {!scrolledToEnd && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
          <ArrowDown className="w-3 h-3" /> Scroll to the end of the article
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" disabled={!canTakeQuiz} onClick={() => setPhase("quiz")}>
          {canTakeQuiz
            ? "Answer questions"
            : !scrolledToEnd
            ? "Read to the end"
            : `Keep reading (${requiredSeconds - secondsRead}s)`}
        </Button>
      </div>
    </div>
  );
}
