import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Video, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Plus,
  Trash2,
  Eye,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  provider: string;
  phone_number: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  fee: number;
  net_amount: number;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number;
  points_reward: number;
  category: string;
  source: string;
  partner_name: string | null;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

interface UpdateWithdrawalResult {
  success: boolean;
  message: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    video_url: '',
    duration_seconds: 30,
    points_reward: 5,
    category: 'entertainment',
    source: 'admin',
    partner_name: ''
  });

  // Check if user is admin
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch pending withdrawals
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Withdrawal[];
    },
    enabled: isAdmin,
  });

  // Fetch videos
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Video[];
    },
    enabled: isAdmin,
  });

  // Update withdrawal mutation
  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ withdrawalId, status, notes }: { withdrawalId: string; status: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('admin_update_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_status: status,
        p_admin_notes: notes || null,
      });
      
      if (error) throw error;
      return data as unknown as UpdateWithdrawalResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add video mutation
  const addVideoMutation = useMutation({
    mutationFn: async (video: typeof newVideo) => {
      const { data, error } = await supabase
        .from('videos')
        .insert({
          ...video,
          created_by: user?.id,
          partner_name: video.partner_name || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Video added successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      setAddVideoOpen(false);
      setNewVideo({
        title: '',
        description: '',
        video_url: '',
        duration_seconds: 30,
        points_reward: 5,
        category: 'entertainment',
        source: 'admin',
        partner_name: ''
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle video status mutation
  const toggleVideoMutation = useMutation({
    mutationFn: async ({ videoId, isActive }: { videoId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('videos')
        .update({ is_active: isActive })
        .eq('id', videoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Video updated');
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Video deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600';
      case 'approved': return 'bg-green-500/10 text-green-600';
      case 'rejected': return 'bg-red-500/10 text-red-600';
      case 'processing': return 'bg-blue-500/10 text-blue-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-center">You don't have admin privileges.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage videos and withdrawals</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <Video className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{videos.length}</p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{withdrawals.filter(w => w.status === 'pending').length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Paid Out</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="withdrawals" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl h-11">
            <TabsTrigger value="withdrawals" className="rounded-lg gap-2">
              <DollarSign className="w-4 h-4" />
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="videos" className="rounded-lg gap-2">
              <Video className="w-4 h-4" />
              Videos
            </TabsTrigger>
          </TabsList>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="mt-4 space-y-3">
            {withdrawalsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : withdrawals.length === 0 ? (
              <Card className="bg-gradient-card">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No withdrawal requests</p>
                </CardContent>
              </Card>
            ) : (
              withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className="bg-gradient-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{withdrawal.amount.toLocaleString()} pts</p>
                        <p className="text-sm text-muted-foreground">
                          {withdrawal.provider} • {withdrawal.phone_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(withdrawal.status)}>
                        {withdrawal.status}
                      </Badge>
                    </div>
                    
                    {withdrawal.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => updateWithdrawalMutation.mutate({
                            withdrawalId: withdrawal.id,
                            status: 'approved'
                          })}
                          disabled={updateWithdrawalMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 gap-1"
                          onClick={() => updateWithdrawalMutation.mutate({
                            withdrawalId: withdrawal.id,
                            status: 'rejected',
                            notes: 'Rejected by admin'
                          })}
                          disabled={updateWithdrawalMutation.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-4 space-y-3">
            {/* Add Video Button */}
            <Dialog open={addVideoOpen} onOpenChange={setAddVideoOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Video
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Video</DialogTitle>
                  <DialogDescription>
                    Add a video to the feed for users to watch and earn points.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Video title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="video_url">Video URL</Label>
                    <Input
                      id="video_url"
                      value={newVideo.video_url}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (seconds)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newVideo.duration_seconds}
                        onChange={(e) => setNewVideo(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) || 30 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="points">Points Reward</Label>
                      <Input
                        id="points"
                        type="number"
                        value={newVideo.points_reward}
                        onChange={(e) => setNewVideo(prev => ({ ...prev, points_reward: parseInt(e.target.value) || 5 }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newVideo.category}
                        onValueChange={(value) => setNewVideo(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="ai">AI Generated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source">Source</Label>
                      <Select
                        value={newVideo.source}
                        onValueChange={(value) => setNewVideo(prev => ({ ...prev, source: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="ai">AI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {newVideo.source === 'partner' && (
                    <div className="space-y-2">
                      <Label htmlFor="partner">Partner Name</Label>
                      <Input
                        id="partner"
                        value={newVideo.partner_name}
                        onChange={(e) => setNewVideo(prev => ({ ...prev, partner_name: e.target.value }))}
                        placeholder="Partner organization name"
                      />
                    </div>
                  )}
                  
                  <Button
                    className="w-full"
                    onClick={() => addVideoMutation.mutate(newVideo)}
                    disabled={!newVideo.title || !newVideo.video_url || addVideoMutation.isPending}
                  >
                    {addVideoMutation.isPending ? 'Adding...' : 'Add Video'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Videos List */}
            {videosLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : videos.length === 0 ? (
              <Card className="bg-gradient-card">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No videos yet</p>
                </CardContent>
              </Card>
            ) : (
              videos.map((video) => (
                <Card key={video.id} className="bg-gradient-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold line-clamp-1">{video.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {video.description || 'No description'}
                        </p>
                      </div>
                      <Badge variant={video.is_active ? "default" : "secondary"}>
                        {video.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <span>{video.duration_seconds}s</span>
                      <span>•</span>
                      <span>{video.points_reward} pts</span>
                      <span>•</span>
                      <span>{video.view_count} views</span>
                      <span>•</span>
                      <span className="capitalize">{video.category}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => window.open(video.video_url, '_blank')}
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => toggleVideoMutation.mutate({
                          videoId: video.id,
                          isActive: !video.is_active
                        })}
                        disabled={toggleVideoMutation.isPending}
                      >
                        {video.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteVideoMutation.mutate(video.id)}
                        disabled={deleteVideoMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
