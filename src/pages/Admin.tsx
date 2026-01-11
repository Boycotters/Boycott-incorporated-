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
  Shield,
  BarChart3,
  ClipboardList,
  Download,
  Settings,
  Activity,
  Database,
  TrendingUp,
  Gamepad2,
  FileText,
  RefreshCw,
  Search,
  ChevronRight,
  Ban,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface VideoItem {
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

interface User {
  id: string;
  email: string;
  full_name: string | null;
  total_points: number | null;
  level: number | null;
  vip_tier: string | null;
  current_streak: number | null;
  created_at: string | null;
  is_verified: boolean | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  points_reward: number;
  category: string | null;
  difficulty: string | null;
  verification_type: string | null;
  is_active: boolean | null;
}

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
}

interface EarningAlgorithm {
  id: string;
  name: string;
  description: string | null;
  config: any;
  is_active: boolean | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
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
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    points_reward: 10,
    category: 'digital',
    difficulty: 'easy',
    verification_type: 'url'
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

  // Fetch platform stats
  const { data: platformStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_stats');
      if (error) throw error;
      return data as any;
    },
    enabled: isAdmin,
  });

  // Fetch pending withdrawals
  const { data: withdrawals = [] } = useQuery({
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
  const { data: videos = [] } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as VideoItem[];
    },
    enabled: isAdmin,
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users', userSearch],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (userSearch) {
        query = query.or(`email.ilike.%${userSearch}%,full_name.ilike.%${userSearch}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as User[];
    },
    enabled: isAdmin,
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: isAdmin,
  });

  // Fetch survey responses
  const { data: surveyResponses = [] } = useQuery({
    queryKey: ['admin-survey-responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as SurveyResponse[];
    },
    enabled: isAdmin,
  });

  // Fetch earning algorithms
  const { data: algorithms = [] } = useQuery({
    queryKey: ['admin-algorithms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('earning_algorithms')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as EarningAlgorithm[];
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
      return data as any;
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      } else {
        toast.error(result?.message || 'Failed to update withdrawal');
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

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (task: typeof newTask) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Task added successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setAddTaskOpen(false);
      setNewTask({
        title: '',
        description: '',
        points_reward: 10,
        category: 'digital',
        difficulty: 'easy',
        verification_type: 'url'
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle task status mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: isActive })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Task updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Export survey data mutation
  const exportSurveyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('export_survey_data', {
        p_mark_exported: true
      });
      
      if (error) throw error;
      return data as any;
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(`Exported ${result.count} survey responses`);
        queryClient.invalidateQueries({ queryKey: ['admin-survey-responses'] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        
        // Download as JSON
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle algorithm mutation
  const toggleAlgorithmMutation = useMutation({
    mutationFn: async ({ algorithmId, isActive }: { algorithmId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('earning_algorithms')
        .update({ is_active: isActive })
        .eq('id', algorithmId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Algorithm updated');
      queryClient.invalidateQueries({ queryKey: ['admin-algorithms'] });
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

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const unexportedSurveys = surveyResponses.filter(s => !s.is_exported);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      <div className="max-w-6xl mx-auto space-y-5">
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
          <div className="flex-1">
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Full platform control</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchStats()}
            disabled={statsLoading}
          >
            <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{platformStats?.total_users || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingWithdrawals.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{platformStats?.total_wallet_balance?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{unexportedSurveys.length}</p>
                  <p className="text-xs text-muted-foreground">Survey Data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max gap-1 h-11 p-1">
              <TabsTrigger value="overview" className="gap-2 px-4">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="gap-2 px-4">
                <DollarSign className="w-4 h-4" />
                Withdrawals
                {pendingWithdrawals.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pendingWithdrawals.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2 px-4">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2 px-4">
                <ClipboardList className="w-4 h-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-2 px-4">
                <Video className="w-4 h-4" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="surveys" className="gap-2 px-4">
                <FileText className="w-4 h-4" />
                Survey Data
                {unexportedSurveys.length > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 bg-purple-500">{unexportedSurveys.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="algorithms" className="gap-2 px-4">
                <Settings className="w-4 h-4" />
                Algorithms
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Today's Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Users</span>
                    <span className="font-semibold">{platformStats?.active_users_today || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tasks Completed</span>
                    <span className="font-semibold">{platformStats?.tasks_completed_today || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Games Played</span>
                    <span className="font-semibold">{platformStats?.games_played_today || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Videos Watched</span>
                    <span className="font-semibold">{platformStats?.videos_watched_today || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">AI Usage</span>
                    <span className="font-semibold">{platformStats?.ai_usage_today || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Points in System</span>
                    <span className="font-semibold">{platformStats?.total_points_in_system?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pending Withdrawals</span>
                    <span className="font-semibold text-yellow-600">{platformStats?.pending_withdrawal_amount?.toLocaleString() || 0} pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Paid Out</span>
                    <span className="font-semibold text-green-600">{platformStats?.approved_withdrawals_total?.toLocaleString() || 0} pts</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Data Monetization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Surveys</span>
                    <span className="font-semibold">{platformStats?.survey_responses_total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Unexported Data</span>
                    <span className="font-semibold text-purple-600">{platformStats?.survey_responses_unexported || 0}</span>
                  </div>
                  {unexportedSurveys.length > 0 && (
                    <Button 
                      className="w-full mt-2 gap-2"
                      onClick={() => exportSurveyMutation.mutate()}
                      disabled={exportSurveyMutation.isPending}
                    >
                      <Download className="w-4 h-4" />
                      Export Survey Data
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5" />
                    Platform Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Tasks</span>
                    <span className="font-semibold">{platformStats?.total_tasks || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Videos</span>
                    <span className="font-semibold">{platformStats?.total_videos || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Transactions</span>
                    <span className="font-semibold">{platformStats?.total_transactions?.toLocaleString() || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="mt-4 space-y-3">
            {withdrawals.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No withdrawal requests</p>
                </CardContent>
              </Card>
            ) : (
              withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{withdrawal.amount.toLocaleString()} pts</p>
                        <p className="text-sm text-muted-foreground">
                          {withdrawal.provider} • {withdrawal.phone_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(withdrawal.created_at).toLocaleDateString()} at {new Date(withdrawal.created_at).toLocaleTimeString()}
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

          {/* Users Tab */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users by email or name..." 
                  className="pl-9"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>
            
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>VIP</TableHead>
                    <TableHead>Streak</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{u.full_name || 'No name'}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{u.total_points?.toLocaleString() || 0}</TableCell>
                      <TableCell>{u.level || 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.vip_tier || 'bronze'}</Badge>
                      </TableCell>
                      <TableCell>{u.current_streak || 0} days</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-4 space-y-3">
            <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task for users to complete and earn points.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Title</Label>
                    <Input
                      id="task-title"
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Task title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea
                      id="task-description"
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Task description"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-points">Points Reward</Label>
                      <Input
                        id="task-points"
                        type="number"
                        value={newTask.points_reward}
                        onChange={(e) => setNewTask(prev => ({ ...prev, points_reward: parseInt(e.target.value) || 10 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-category">Category</Label>
                      <Select
                        value={newTask.category}
                        onValueChange={(value) => setNewTask(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="digital">Digital</SelectItem>
                          <SelectItem value="physical">Physical</SelectItem>
                          <SelectItem value="survey">Survey</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-difficulty">Difficulty</Label>
                      <Select
                        value={newTask.difficulty}
                        onValueChange={(value) => setNewTask(prev => ({ ...prev, difficulty: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-verification">Verification</Label>
                      <Select
                        value={newTask.verification_type}
                        onValueChange={(value) => setNewTask(prev => ({ ...prev, verification_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="screenshot">Screenshot</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                          <SelectItem value="timer">Timer</SelectItem>
                          <SelectItem value="survey">Survey</SelectItem>
                          <SelectItem value="data">Data Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => addTaskMutation.mutate(newTask)}
                    disabled={addTaskMutation.isPending || !newTask.title}
                  >
                    Add Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{task.title}</p>
                        <Badge variant="outline">{task.category}</Badge>
                        <Badge variant="secondary">{task.difficulty}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                      <p className="text-sm font-medium text-primary mt-1">+{task.points_reward} pts</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={task.is_active ?? false}
                        onCheckedChange={(checked) => toggleTaskMutation.mutate({ taskId: task.id, isActive: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-4 space-y-3">
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
                    Add a video for users to watch and earn points.
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="partner_name">Partner Name (optional)</Label>
                    <Input
                      id="partner_name"
                      value={newVideo.partner_name}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, partner_name: e.target.value }))}
                      placeholder="Partner company name"
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => addVideoMutation.mutate(newVideo)}
                    disabled={addVideoMutation.isPending || !newVideo.title || !newVideo.video_url}
                  >
                    Add Video
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {videos.map((video) => (
              <Card key={video.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold line-clamp-1">{video.title}</p>
                        <Badge variant="outline">{video.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {video.duration_seconds}s • {video.view_count} views • +{video.points_reward} pts
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(video.video_url, '_blank')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={video.is_active}
                        onCheckedChange={(checked) => toggleVideoMutation.mutate({ videoId: video.id, isActive: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteVideoMutation.mutate(video.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Survey Data Tab */}
          <TabsContent value="surveys" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Survey Data Vault
                  </span>
                  <Button 
                    onClick={() => exportSurveyMutation.mutate()}
                    disabled={exportSurveyMutation.isPending || unexportedSurveys.length === 0}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export All ({unexportedSurveys.length})
                  </Button>
                </CardTitle>
                <CardDescription>
                  Collected survey responses for data monetization. Export to JSON for analysis or selling.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {surveyResponses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No survey responses collected yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Survey</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {surveyResponses.map((survey) => (
                        <TableRow key={survey.id}>
                          <TableCell className="font-medium">{survey.survey_title}</TableCell>
                          <TableCell>{Array.isArray(survey.questions) ? survey.questions.length : 0}</TableCell>
                          <TableCell>{survey.completion_time_seconds ? `${survey.completion_time_seconds}s` : 'N/A'}</TableCell>
                          <TableCell>{survey.points_awarded}</TableCell>
                          <TableCell>
                            <Badge variant={survey.is_exported ? "secondary" : "default"}>
                              {survey.is_exported ? 'Exported' : 'New'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(survey.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Algorithms Tab */}
          <TabsContent value="algorithms" className="mt-4 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Earning Algorithms
                </CardTitle>
                <CardDescription>
                  Configure platform earning rules and limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {algorithms.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No algorithms configured</p>
                ) : (
                  algorithms.map((algo) => (
                    <Card key={algo.id} className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{algo.name}</p>
                              <Badge variant={algo.is_active ? "default" : "secondary"}>
                                {algo.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{algo.description}</p>
                            <pre className="mt-2 text-xs bg-background p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(algo.config, null, 2)}
                            </pre>
                          </div>
                          <Switch
                            checked={algo.is_active ?? false}
                            onCheckedChange={(checked) => toggleAlgorithmMutation.mutate({ algorithmId: algo.id, isActive: checked })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}