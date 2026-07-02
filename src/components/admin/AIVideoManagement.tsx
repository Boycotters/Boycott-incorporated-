import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Video, Plus, Trash2, Loader2, Sparkles, Eye, MapPin, Send, Play } from "lucide-react";

interface AIVideo {
  id: string;
  title: string;
  prompt: string;
  video_url: string | null;
  thumbnail_url: string | null;
  status: string;
  target_placement: string;
  duration_seconds: number;
  points_reward: number;
  is_active: boolean;
  created_by: string | null;
  metadata: any;
  created_at: string;
}

export function AIVideoManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<AIVideo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: "",
    prompt: "",
    target_placement: "videos",
    duration_seconds: "30",
    points_reward: "5",
    video_url: "",
    thumbnail_url: "",
  });

  const { data: aiVideos = [], isLoading } = useQuery({
    queryKey: ["admin-ai-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_generated_videos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AIVideo[];
    },
  });

  // Realtime: live updates whenever an AI video changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-ai-videos-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_generated_videos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-ai-videos'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (video: typeof newVideo) => {
      setGenerating(true);
      try {
        // Use AI to generate video concept/script when prompt provided
        let aiConcept: any = null;
        try {
          const { data: aiResult } = await supabase.functions.invoke("ai-service", {
            body: {
              action: "generate_partnership",
              data: {
                brandCategory: "entertainment",
                targetAudience: "general",
                campaignType: video.prompt,
              },
            },
          });
          aiConcept = aiResult?.data || null;
        } catch (_) {}

        const { error } = await supabase.from("ai_generated_videos").insert({
          title: video.title,
          prompt: video.prompt,
          target_placement: video.target_placement,
          duration_seconds: parseInt(video.duration_seconds) || 30,
          points_reward: parseInt(video.points_reward) || 5,
          video_url: video.video_url || null,
          thumbnail_url: video.thumbnail_url || null,
          created_by: user?.id,
          status: video.video_url ? "ready" : "generated",
          metadata: aiConcept ? { ai_concept: aiConcept } : {},
        });
        if (error) throw error;
      } finally {
        setGenerating(false);
      }
    },
    onSuccess: () => {
      toast.success("AI video saved");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-videos"] });
      setCreateOpen(false);
      setNewVideo({ title: "", prompt: "", target_placement: "videos", duration_seconds: "30", points_reward: "5", video_url: "", thumbnail_url: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("ai_generated_videos")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-videos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMutation = useMutation({
    mutationFn: async (video: AIVideo) => {
      if (!video.video_url) throw new Error("Add a video URL before publishing");
      // Activate the AI video
      await supabase
        .from("ai_generated_videos")
        .update({ is_active: true, status: "published", updated_at: new Date().toISOString() })
        .eq("id", video.id);
      // Mirror into 'videos' table for Watch & Earn placement when applicable
      if (video.target_placement === "videos" || video.target_placement === "all") {
        await supabase.from("videos").insert({
          title: video.title,
          description: video.prompt,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          duration_seconds: video.duration_seconds,
          points_reward: video.points_reward,
          category: "ai",
          source: "ai",
          partner_name: "AI",
          is_active: true,
          created_by: user?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Published to placement");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-videos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_generated_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-videos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated": return <Badge className="bg-blue-500/10 text-blue-600">Concept</Badge>;
      case "ready": return <Badge className="bg-amber-500/10 text-amber-600">Ready</Badge>;
      case "published": return <Badge className="bg-green-500/10 text-green-600">Published</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlacementLabel = (placement: string) => {
    switch (placement) {
      case "videos": return "Watch & Earn";
      case "home": return "Home Page";
      case "discover": return "Discover";
      case "earn": return "Earn Section";
      case "all": return "All Sections";
      default: return placement;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Video Creator & Editor
              </CardTitle>
              <CardDescription>Generate, preview, and allocate AI videos across the app</CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Generate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate AI Video
                  </DialogTitle>
                  <DialogDescription>Create a concept, attach a video URL, then preview & publish.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Video Title</Label>
                    <Input
                      value={newVideo.title}
                      onChange={(e) => setNewVideo(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Zambian Market Trends 2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AI Prompt / Description</Label>
                    <Textarea
                      value={newVideo.prompt}
                      onChange={(e) => setNewVideo(p => ({ ...p, prompt: e.target.value }))}
                      placeholder="Describe the video content..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Video URL (mp4 / hosted)</Label>
                    <Input
                      value={newVideo.video_url}
                      onChange={(e) => setNewVideo(p => ({ ...p, video_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-muted-foreground">Required to preview & publish to a section.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Thumbnail URL (optional)</Label>
                    <Input
                      value={newVideo.thumbnail_url}
                      onChange={(e) => setNewVideo(p => ({ ...p, thumbnail_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Placement</Label>
                    <Select
                      value={newVideo.target_placement}
                      onValueChange={(v) => setNewVideo(p => ({ ...p, target_placement: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="videos">Watch & Earn</SelectItem>
                        <SelectItem value="home">Home Page</SelectItem>
                        <SelectItem value="discover">Discover</SelectItem>
                        <SelectItem value="earn">Earn Section</SelectItem>
                        <SelectItem value="all">All Sections</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Duration (seconds)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={newVideo.duration_seconds}
                        onChange={(e) => setNewVideo(p => ({ ...p, duration_seconds: e.target.value.replace(/\D/g, "") }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Users must watch ≥{" "}
                        <span className="font-semibold text-primary">
                          {Math.ceil((parseInt(newVideo.duration_seconds) || 0) * 0.8)}s
                        </span>{" "}
                        (80%) to claim points.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Points Reward</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={newVideo.points_reward}
                        onChange={(e) => setNewVideo(p => ({ ...p, points_reward: e.target.value.replace(/\D/g, "") }))}
                      />
                    </div>
                  </div>

                  {newVideo.video_url && (
                    <div className="space-y-2">
                      <Label>Live Preview</Label>
                      <video
                        src={newVideo.video_url}
                        controls
                        className="w-full rounded-lg bg-black aspect-video"
                      />
                    </div>
                  )}

                  <Button
                    className="w-full gap-2"
                    onClick={() => createMutation.mutate(newVideo)}
                    disabled={!newVideo.title || !newVideo.prompt || generating || createMutation.isPending}
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generating ? "Generating..." : "Save Video"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : aiVideos.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No AI videos yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiVideos.map((video) => (
                <div key={video.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Video className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm">{video.title}</p>
                      {getStatusBadge(video.status)}
                      <Badge variant="outline" className="text-xs gap-1">
                        <MapPin className="w-3 h-3" />
                        {getPlacementLabel(video.target_placement)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{video.prompt}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>{video.duration_seconds}s</span>
                      <span>+{video.points_reward} pts</span>
                      <span>{new Date(video.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {video.video_url && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewVideo(video)}>
                        <Play className="w-4 h-4 text-primary" />
                      </Button>
                    )}
                    <Switch
                      checked={video.is_active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: video.id, isActive: checked })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => deleteMutation.mutate(video.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview & Publish Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(o) => !o && setPreviewVideo(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewVideo?.title}</DialogTitle>
            <DialogDescription>Preview before publishing to {previewVideo ? getPlacementLabel(previewVideo.target_placement) : ""}.</DialogDescription>
          </DialogHeader>
          {previewVideo?.video_url && (
            <video
              src={previewVideo.video_url}
              controls
              autoPlay
              className="w-full rounded-lg bg-black aspect-video"
            />
          )}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 gap-2"
              onClick={() => previewVideo && publishMutation.mutate(previewVideo)}
              disabled={publishMutation.isPending}
            >
              <Send className="w-4 h-4" />
              Publish to {previewVideo ? getPlacementLabel(previewVideo.target_placement) : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
