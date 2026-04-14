import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Video, Plus, Trash2, Loader2, Sparkles, Eye, MapPin } from "lucide-react";

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
  const { loading: aiLoading } = useAI();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: "",
    prompt: "",
    target_placement: "videos",
    duration_seconds: "30",
    points_reward: "5",
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

  const createMutation = useMutation({
    mutationFn: async (video: typeof newVideo) => {
      setGenerating(true);
      try {
        // Use AI to generate video concept/script
        const { data: aiResult, error: aiError } = await supabase.functions.invoke("ai-service", {
          body: {
            action: "generate_partnership",
            data: {
              brandCategory: "entertainment",
              targetAudience: "general",
              campaignType: video.prompt,
            },
          },
        });

        const { error } = await supabase.from("ai_generated_videos").insert({
          title: video.title,
          prompt: video.prompt,
          target_placement: video.target_placement,
          duration_seconds: parseInt(video.duration_seconds) || 30,
          points_reward: parseInt(video.points_reward) || 5,
          created_by: user?.id,
          status: "generated",
          metadata: aiResult?.data ? { ai_concept: aiResult.data } : {},
        });
        if (error) throw error;
      } finally {
        setGenerating(false);
      }
    },
    onSuccess: () => {
      toast.success("AI video concept created");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-videos"] });
      setCreateOpen(false);
      setNewVideo({ title: "", prompt: "", target_placement: "videos", duration_seconds: "30", points_reward: "5" });
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
      case "generated": return <Badge className="bg-blue-500/10 text-blue-600">Generated</Badge>;
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
              <CardDescription>Generate AI video concepts and manage placement across the app</CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Generate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate AI Video
                  </DialogTitle>
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
                      placeholder="Describe the video content you want AI to generate..."
                      rows={3}
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
                  <Button
                    className="w-full gap-2"
                    onClick={() => createMutation.mutate(newVideo)}
                    disabled={!newVideo.title || !newVideo.prompt || generating || createMutation.isPending}
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generating ? "Generating with AI..." : "Generate Video Concept"}
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
              <p className="text-sm text-muted-foreground">No AI videos generated yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Use the Generate button to create AI video concepts.</p>
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
                  <div className="flex items-center gap-2 shrink-0">
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
    </div>
  );
}
