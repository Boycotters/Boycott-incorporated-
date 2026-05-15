import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Database, Download, Search, FileText, Coins, Clock, User,
  CheckCircle2, Sparkles, Filter, Eye, BarChart3, Smartphone, Trash2
} from "lucide-react";

interface SurveyResponse {
  id: string;
  survey_id: string;
  survey_title: string;
  questions: any[];
  responses: any[];
  demographic_data: any;
  device_info: any;
  completion_time_seconds: number | null;
  points_awarded: number;
  is_exported: boolean;
  created_at: string;
  user_id: string | null;
  user_email?: string | null;
  user_name?: string | null;
}

const STAT_CARD = "rounded-2xl border bg-gradient-to-br p-4 transition-shadow hover:shadow-md";

export function SurveyDataVault() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "exported">("all");
  const [selected, setSelected] = useState<SurveyResponse | null>(null);

  const { data: surveyResponses = [], isLoading } = useQuery({
    queryKey: ["admin-survey-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as SurveyResponse[];
    },
  });

  const stats = useMemo(() => {
    const total = surveyResponses.length;
    const unexported = surveyResponses.filter(s => !s.is_exported).length;
    const totalQuestions = surveyResponses.reduce(
      (acc, s) => acc + (Array.isArray(s.questions) ? s.questions.length : 0), 0);
    const avgTime = total
      ? Math.round(surveyResponses.reduce((a, s) => a + (s.completion_time_seconds || 0), 0) / total)
      : 0;
    const totalPoints = surveyResponses.reduce((a, s) => a + (s.points_awarded || 0), 0);
    const uniqueUsers = new Set(surveyResponses.map(s => s.user_id).filter(Boolean)).size;
    return { total, unexported, totalQuestions, avgTime, totalPoints, uniqueUsers };
  }, [surveyResponses]);

  const filtered = useMemo(() => {
    let list = surveyResponses;
    if (filter === "new") list = list.filter(s => !s.is_exported);
    if (filter === "exported") list = list.filter(s => s.is_exported);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.survey_title?.toLowerCase().includes(q) ||
        s.user_email?.toLowerCase().includes(q) ||
        s.user_name?.toLowerCase().includes(q) ||
        s.survey_id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [surveyResponses, filter, search]);

  const exportAll = useMutation({
    mutationFn: async () => {
      const ids = surveyResponses.filter(s => !s.is_exported).map(s => s.id);
      if (ids.length === 0) throw new Error("Nothing to export");
      const csv = buildCSV(surveyResponses.filter(s => ids.includes(s.id)));
      downloadCSV(csv, `surveys-${new Date().toISOString().slice(0, 10)}.csv`);
      const { error } = await supabase
        .from("survey_responses")
        .update({ is_exported: true, exported_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`Exported ${n} responses`);
      queryClient.invalidateQueries({ queryKey: ["admin-survey-responses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportOne = (s: SurveyResponse) => {
    const csv = buildCSV([s]);
    downloadCSV(csv, `${s.survey_title.replace(/\W+/g, "-")}-${s.id.slice(0, 6)}.csv`);
    toast.success("Downloaded response CSV");
  };

  return (
    <div className="space-y-4">
      {/* Premium stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`${STAT_CARD} from-primary/15 to-primary/5 border-primary/20`}>
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground">survey responses</p>
        </div>
        <div className={`${STAT_CARD} from-accent/20 to-accent/5 border-accent/20`}>
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="w-4 h-4 text-accent-foreground" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold">{stats.unexported}</p>
          <p className="text-[11px] text-muted-foreground">ready to export</p>
        </div>
        <div className={`${STAT_CARD} from-emerald-500/15 to-emerald-500/5 border-emerald-500/20`}>
          <div className="flex items-center justify-between mb-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-muted-foreground">Reach</span>
          </div>
          <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
          <p className="text-[11px] text-muted-foreground">unique respondents</p>
        </div>
        <div className={`${STAT_CARD} from-violet-500/15 to-violet-500/5 border-violet-500/20`}>
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-4 h-4 text-violet-600" />
            <span className="text-xs text-muted-foreground">Avg time</span>
          </div>
          <p className="text-2xl font-bold">{stats.avgTime}s</p>
          <p className="text-[11px] text-muted-foreground">to complete</p>
        </div>
        <div className={`${STAT_CARD} from-blue-500/15 to-blue-500/5 border-blue-500/20`}>
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Volume</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalQuestions}</p>
          <p className="text-[11px] text-muted-foreground">questions answered</p>
        </div>
        <div className={`${STAT_CARD} from-amber-500/15 to-amber-500/5 border-amber-500/20`}>
          <div className="flex items-center justify-between mb-2">
            <Coins className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Paid out</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">total points</p>
        </div>
        <div className={`${STAT_CARD} from-rose-500/15 to-rose-500/5 border-rose-500/20`}>
          <div className="flex items-center justify-between mb-2">
            <Database className="w-4 h-4 text-rose-600" />
            <span className="text-xs text-muted-foreground">Data value</span>
          </div>
          <p className="text-2xl font-bold">K{(stats.total * 0.5).toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground">est. market value</p>
        </div>
        <div className={`${STAT_CARD} from-teal-500/15 to-teal-500/5 border-teal-500/20`}>
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span className="text-xs text-muted-foreground">Exported</span>
          </div>
          <p className="text-2xl font-bold">{stats.total - stats.unexported}</p>
          <p className="text-[11px] text-muted-foreground">already shipped</p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Survey Data Vault
              </CardTitle>
              <CardDescription>Raw responses with respondent context, timing & device data.</CardDescription>
            </div>
            <Button
              onClick={() => exportAll.mutate()}
              disabled={exportAll.isPending || stats.unexported === 0}
              className="gap-2 rounded-xl"
            >
              <Download className="w-4 h-4" />
              Export CSV ({stats.unexported})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by survey, name, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[150px] rounded-xl gap-2">
                <Filter className="w-3.5 h-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({stats.total})</SelectItem>
                <SelectItem value="new">Pending ({stats.unexported})</SelectItem>
                <SelectItem value="exported">Exported ({stats.total - stats.unexported})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading vault…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground text-sm">No responses match.</p>
            </div>
          ) : (
            <ScrollArea className="h-[480px] -mx-2 px-2">
              <div className="space-y-2">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className="w-full text-left p-3 rounded-xl border bg-card hover:bg-muted/30 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{s.survey_title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.user_name || s.user_email || "Anonymous"} · {new Date(s.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant={s.is_exported ? "secondary" : "default"}
                          className={!s.is_exported ? "bg-accent text-accent-foreground" : ""}
                        >
                          {s.is_exported ? "Exported" : "New"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground pl-11">
                      <Badge variant="outline" className="gap-1 font-normal">
                        <FileText className="w-3 h-3" />
                        {Array.isArray(s.questions) ? s.questions.length : 0} questions
                      </Badge>
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Coins className="w-3 h-3" />+{s.points_awarded}
                      </Badge>
                      {s.completion_time_seconds && (
                        <Badge variant="outline" className="gap-1 font-normal">
                          <Clock className="w-3 h-3" />
                          {s.completion_time_seconds}s
                        </Badge>
                      )}
                      {s.device_info?.platform && (
                        <Badge variant="outline" className="gap-1 font-normal">
                          <Smartphone className="w-3 h-3" />
                          {s.device_info.platform}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selected?.survey_title}
            </DialogTitle>
            <DialogDescription>
              {selected?.user_name || selected?.user_email || "Anonymous"} ·{" "}
              {selected && new Date(selected.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Points</p>
                  <p className="font-bold text-primary">+{selected.points_awarded}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Time</p>
                  <p className="font-bold">{selected.completion_time_seconds ?? "—"}s</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-bold">{selected.is_exported ? "Exported" : "New"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Responses</p>
                <div className="space-y-2">
                  {Array.isArray(selected.questions) && selected.questions.map((q: any, idx: number) => (
                    <div key={idx} className="bg-muted/30 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">Q{idx + 1}: {q.question || q.text || "Question"}</p>
                      <p className="text-sm">
                        <span className="font-medium text-primary">→ </span>
                        {Array.isArray(selected.responses) && selected.responses[idx] !== undefined
                          ? String(selected.responses[idx]?.answer ?? selected.responses[idx])
                          : "No response"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {selected.device_info && Object.keys(selected.device_info).length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Device</p>
                  <pre className="text-[11px] bg-muted/30 p-3 rounded-xl overflow-auto max-h-32">
                    {JSON.stringify(selected.device_info, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => exportOne(selected)}>
                  <Download className="w-4 h-4" />
                  Download this response
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildCSV(rows: SurveyResponse[]): string {
  const headers = [
    "id", "survey_id", "survey_title", "user_email", "user_name",
    "points_awarded", "completion_time_seconds", "created_at",
    "questions_count", "responses_json", "device_platform"
  ];
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.survey_id, r.survey_title, r.user_email, r.user_name,
      r.points_awarded, r.completion_time_seconds, r.created_at,
      Array.isArray(r.questions) ? r.questions.length : 0,
      r.responses, r.device_info?.platform
    ].map(escape).join(","));
  }
  return lines.join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
