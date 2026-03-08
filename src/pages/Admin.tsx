import { useState, useRef } from "react";
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
  UserCheck,
  Key,
  Upload,
  Link as LinkIcon,
  User,
  Send,
  Navigation as NavigationIcon,
  ShieldAlert,
  AlertTriangle,
  CalendarClock
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TaskManagement, WithdrawalManagement, UserManagement, TournamentManagement, TransferManagement } from "@/components/admin";
import { GPSTrackingDashboard } from "@/components/admin/GPSTrackingDashboard";
import { SecurityCompliancePanel } from "@/components/admin/SecurityCompliancePanel";

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
  phone: string | null;
  phone_verified: boolean | null;
  total_points: number | null;
  level: number | null;
  vip_tier: string | null;
  current_streak: number | null;
  created_at: string | null;
  is_verified: boolean | null;
  is_banned: boolean | null;
  ban_reason: string | null;
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
  page_placement: string | null;
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
  user_id: string | null;
  user_email?: string | null;
  user_name?: string | null;
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
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [videoUploadType, setVideoUploadType] = useState<'url' | 'file'>('url');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  // Upload video file to storage
  const uploadVideoFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `videos/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('entertainment-videos')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('entertainment-videos')
      .getPublicUrl(filePath);
    
    return publicUrl;
  };

  // Add video mutation with file upload support
  const addVideoMutation = useMutation({
    mutationFn: async ({ video, file }: { video: typeof newVideo; file?: File | null }) => {
      let videoUrl = video.video_url;
      
      // If a file is provided, upload it first
      if (file) {
        setUploadingVideo(true);
        try {
          videoUrl = await uploadVideoFile(file);
        } finally {
          setUploadingVideo(false);
        }
      }
      
      const { data, error } = await supabase
        .from('videos')
        .insert({
          ...video,
          video_url: videoUrl,
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
      setSelectedVideoFile(null);
      setVideoUploadType('url');
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

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, isBanned, reason }: { userId: string; isBanned: boolean; reason: string }) => {
      const { data, error } = await supabase.rpc('admin_ban_user', {
        p_user_id: userId,
        p_is_banned: isBanned,
        p_ban_reason: reason,
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      } else {
        toast.error(result?.message || 'Failed to update user');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Change PIN mutation
  const changePinMutation = useMutation({
    mutationFn: async ({ oldPin, newPin }: { oldPin: string; newPin: string }) => {
      const { data, error } = await supabase.rpc('update_admin_pin', {
        p_old_pin: oldPin,
        p_new_pin: newPin,
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(result.message);
        setChangePinOpen(false);
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        toast.error(result?.message || 'Failed to update PIN');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleChangePin = () => {
    if (oldPin.length !== 6 || newPin.length !== 6) {
      toast.error('PIN must be exactly 6 digits');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('New PIN and confirmation do not match');
      return;
    }
    changePinMutation.mutate({ oldPin, newPin });
  };

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
          
          {/* Change PIN Button */}
          <Dialog open={changePinOpen} onOpenChange={setChangePinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl">
                <Key className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Admin PIN</DialogTitle>
                <DialogDescription>
                  Update your admin access PIN. Make sure to remember the new PIN.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPin">Current PIN</Label>
                  <Input
                    id="oldPin"
                    type="password"
                    maxLength={6}
                    placeholder="Enter current 6-digit PIN"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPin">New PIN</Label>
                  <Input
                    id="newPin"
                    type="password"
                    maxLength={6}
                    placeholder="Enter new 6-digit PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirm New PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    maxLength={6}
                    placeholder="Confirm new 6-digit PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <Button 
                  onClick={handleChangePin}
                  disabled={changePinMutation.isPending || oldPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                  className="w-full"
                >
                  {changePinMutation.isPending ? 'Updating...' : 'Update PIN'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
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

        {/* Navigation Tabs - Scrollable for portrait mode */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex w-max gap-1 h-11 p-1 min-w-full sm:min-w-0">
              <TabsTrigger value="overview" className="gap-1.5 px-3 shrink-0">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="gap-1.5 px-3 shrink-0">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Payouts</span>
                {pendingWithdrawals.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingWithdrawals.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 px-3 shrink-0">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1.5 px-3 shrink-0">
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-1.5 px-3 shrink-0">
                <Video className="w-4 h-4" />
                <span className="hidden sm:inline">Videos</span>
              </TabsTrigger>
              <TabsTrigger value="surveys" className="gap-1.5 px-3 shrink-0">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Surveys</span>
                {unexportedSurveys.length > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 text-xs bg-primary">{unexportedSurveys.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="algorithms" className="gap-1.5 px-3 shrink-0">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="gap-1.5 px-3 shrink-0">
                <Gamepad2 className="w-4 h-4" />
                <span className="hidden sm:inline">Tournaments</span>
              </TabsTrigger>
              <TabsTrigger value="verification" className="gap-1.5 px-3 shrink-0">
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Verify</span>
              </TabsTrigger>
              <TabsTrigger value="transfers" className="gap-1.5 px-3 shrink-0">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Transfers</span>
              </TabsTrigger>
              <TabsTrigger value="gps-tracking" className="gap-1.5 px-3 shrink-0">
                <NavigationIcon className="w-4 h-4" />
                <span className="hidden sm:inline">GPS</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5 px-3 shrink-0">
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
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
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Avg Points/User</span>
                    <span className="font-semibold">{Math.round(platformStats?.avg_user_points || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-500" />
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
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Revenue Potential</span>
                    <span className="font-semibold text-green-600">K{Math.round(platformStats?.revenue_potential_zmw || 0)}</span>
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-orange-500" />
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
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Referrals</span>
                    <span className="font-semibold">{platformStats?.total_referrals || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                    User Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Phone Verified</span>
                    <span className="font-semibold">{platformStats?.users_with_phone_verified || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Redemptions</span>
                    <span className="font-semibold">{platformStats?.total_redemptions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Max Points (User)</span>
                    <span className="font-semibold">{platformStats?.max_user_points?.toLocaleString() || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-500" />
                    VIP Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(platformStats?.users_by_tier || {}).map(([tier, count]) => (
                    <div key={tier} className="flex justify-between items-center">
                      <Badge variant="outline" className="capitalize">{tier}</Badge>
                      <span className="font-semibold">{String(count)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Top Earners Section */}
            {platformStats?.top_earners && Array.isArray(platformStats.top_earners) && platformStats.top_earners.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Top 10 Earners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platformStats.top_earners.map((earner: any, index: number) => (
                        <TableRow key={earner.id}>
                          <TableCell className="font-bold">{index + 1}</TableCell>
                          <TableCell className="font-medium">{earner.full_name || 'No name'}</TableCell>
                          <TableCell className="text-muted-foreground">{earner.email}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {earner.total_points?.toLocaleString() || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="mt-4">
            <WithdrawalManagement withdrawals={withdrawals} />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-4">
            <UserManagement 
              users={users} 
              searchQuery={userSearch}
              onSearchChange={setUserSearch}
            />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-4">
            <TaskManagement tasks={tasks} />
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
                    Add a video for users to watch and earn points. You can upload a file or paste a URL.
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
                  
                  {/* Video Source Toggle */}
                  <div className="space-y-2">
                    <Label>Video Source</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={videoUploadType === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVideoUploadType('url')}
                        className="flex-1 gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        URL
                      </Button>
                      <Button
                        type="button"
                        variant={videoUploadType === 'file' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVideoUploadType('file')}
                        className="flex-1 gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload File
                      </Button>
                    </div>
                  </div>

                  {videoUploadType === 'url' ? (
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Video URL</Label>
                      <Input
                        id="video_url"
                        value={newVideo.video_url}
                        onChange={(e) => setNewVideo(prev => ({ ...prev, video_url: e.target.value }))}
                        placeholder="https://youtube.com/... or direct video link"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Upload Video File</Label>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/mov,video/quicktime"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedVideoFile(file);
                            // Auto-fill title from filename if empty
                            if (!newVideo.title) {
                              setNewVideo(prev => ({ 
                                ...prev, 
                                title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') 
                              }));
                            }
                          }
                        }}
                      />
                      <div 
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => videoInputRef.current?.click()}
                      >
                        {selectedVideoFile ? (
                          <div className="space-y-2">
                            <Video className="w-10 h-10 mx-auto text-primary" />
                            <p className="font-medium">{selectedVideoFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedVideoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVideoFile(null);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                            <p className="font-medium">Click to upload video</p>
                            <p className="text-sm text-muted-foreground">
                              MP4, WebM, MOV up to 100MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
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
                    onClick={() => addVideoMutation.mutate({ video: newVideo, file: selectedVideoFile })}
                    disabled={addVideoMutation.isPending || uploadingVideo || !newVideo.title || (videoUploadType === 'url' ? !newVideo.video_url : !selectedVideoFile)}
                  >
                    {uploadingVideo ? 'Uploading...' : addVideoMutation.isPending ? 'Adding...' : 'Add Video'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {videos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No videos added yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add entertainment videos for users to watch and earn</p>
                </CardContent>
              </Card>
            ) : (
              videos.map((video) => (
                <Card key={video.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold line-clamp-1">{video.title}</p>
                          <Badge variant="outline">{video.category}</Badge>
                          {video.source === 'admin' && (
                            <Badge variant="secondary" className="text-xs">Uploaded</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {video.duration_seconds}s • {video.view_count} views • +{video.points_reward} pts
                        </p>
                        {video.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{video.description}</p>
                        )}
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
              ))
            )}
          </TabsContent>

          {/* Survey Data Tab */}
          <TabsContent value="surveys" className="mt-4 space-y-4">
            {/* Survey Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{surveyResponses.length}</p>
                  <p className="text-xs text-muted-foreground">Total Responses</p>
                </CardContent>
              </Card>
              <Card className="bg-accent/10 border-accent/20">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{unexportedSurveys.length}</p>
                  <p className="text-xs text-muted-foreground">Ready to Export</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/50 border-secondary">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-secondary-foreground">
                    {surveyResponses.reduce((acc, s) => acc + (Array.isArray(s.questions) ? s.questions.length : 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Questions</p>
                </CardContent>
              </Card>
              <Card className="bg-muted border-muted">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    K{Math.round(surveyResponses.length * 0.5)}
                  </p>
                  <p className="text-xs text-muted-foreground">Est. Data Value</p>
                </CardContent>
              </Card>
            </div>

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
                  Collected survey responses with user info. Click a row to see full response details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {surveyResponses.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No survey responses collected yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Survey data will appear here as users complete surveys</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {surveyResponses.map((survey) => (
                      <Collapsible
                        key={survey.id}
                        open={expandedSurvey === survey.id}
                        onOpenChange={(open) => setExpandedSurvey(open ? survey.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">{survey.survey_title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {survey.user_name || survey.user_email || 'Anonymous'} • {new Date(survey.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="shrink-0">
                                    {Array.isArray(survey.questions) ? survey.questions.length : 0} Q
                                  </Badge>
                                  <Badge variant="secondary" className="shrink-0">
                                    +{survey.points_awarded} pts
                                  </Badge>
                                  <Badge 
                                    variant={survey.is_exported ? "secondary" : "default"} 
                                    className={!survey.is_exported ? "bg-accent text-accent-foreground" : ""}
                                  >
                                    {survey.is_exported ? 'Exported' : 'New'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <Card className="mt-1 border-primary/20 bg-muted/30">
                            <CardContent className="p-4 space-y-4">
                              {/* User Info */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs">User</p>
                                  <p className="font-medium">{survey.user_name || 'No name'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Email</p>
                                  <p className="font-medium truncate">{survey.user_email || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Completion Time</p>
                                  <p className="font-medium">{survey.completion_time_seconds ? `${survey.completion_time_seconds}s` : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Survey ID</p>
                                  <p className="font-medium text-xs truncate">{survey.survey_id}</p>
                                </div>
                              </div>

                              {/* Questions & Answers */}
                              <div className="border-t pt-4">
                                <p className="font-medium text-sm mb-3">Questions & Responses</p>
                                <div className="space-y-3">
                                  {Array.isArray(survey.questions) && survey.questions.map((q: any, idx: number) => (
                                    <div key={idx} className="bg-background rounded-lg p-3">
                                      <p className="text-sm font-medium text-muted-foreground mb-1">
                                        Q{idx + 1}: {q.question || q.text || 'Question'}
                                      </p>
                                      <p className="text-sm">
                                        <span className="text-primary font-medium">Answer: </span>
                                        {Array.isArray(survey.responses) && survey.responses[idx] !== undefined
                                          ? String(survey.responses[idx].answer || survey.responses[idx])
                                          : 'No response'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Device Info */}
                              {survey.device_info && Object.keys(survey.device_info).length > 0 && (
                                <div className="border-t pt-4">
                                  <p className="font-medium text-sm mb-2">Device Info</p>
                                  <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-24">
                                    {JSON.stringify(survey.device_info, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
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
                  Platform Algorithms & Configuration
                </CardTitle>
                <CardDescription>
                  Configure platform earning rules, daily caps, and verification algorithms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Daily Cap Algorithm Info */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Daily Earning Cap Algorithm</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-background p-3 rounded-lg">
                        <p className="text-muted-foreground text-xs">With Campaign</p>
                        <p className="text-xl font-bold text-primary">400 pts (K40)</p>
                        <p className="text-xs text-muted-foreground">50% campaign / 50% tasks</p>
                      </div>
                      <div className="bg-background p-3 rounded-lg">
                        <p className="text-muted-foreground text-xs">No Campaign</p>
                        <p className="text-xl font-bold">200 pts (K20)</p>
                        <p className="text-xs text-muted-foreground">Regular earning limit</p>
                      </div>
                    </div>
                    <div className="bg-background p-3 rounded-lg text-sm">
                      <p className="text-muted-foreground text-xs mb-1">Weekly Limit</p>
                      <p className="font-semibold">900 pts (Mon-Fri)</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign Task Verification Algorithm */}
                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-accent-foreground" />
                      <p className="font-semibold">Campaign Task Verification</p>
                    </div>
                    <div className="text-sm space-y-2 text-muted-foreground">
                      <p>• <strong>GPS Check:</strong> Verify user is in target location</p>
                      <p>• <strong>Photo Proof:</strong> Screenshot verification required</p>
                      <p>• <strong>Time Gate:</strong> Minimum engagement time enforced</p>
                      <p>• <strong>Quiz Gate:</strong> Knowledge check before reward</p>
                      <p>• <strong>Daily Limit:</strong> Max campaign tasks capped at 50% of daily cap</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Existing algorithms from DB */}
                {algorithms.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No custom algorithms configured</p>
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

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="mt-4">
            <TournamentManagement />
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="mt-4 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Task Verification Types
                </CardTitle>
                <CardDescription>
                  Overview of verification methods available for tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: 'screenshot', label: 'Screenshot Verification', desc: 'User uploads a screenshot as proof of task completion' },
                  { type: 'url', label: 'URL Verification', desc: 'User submits a URL to verify task completion' },
                  { type: 'timer', label: 'Timer Verification', desc: 'User must spend minimum time on task' },
                  { type: 'gps', label: 'GPS Location Verification', desc: 'Verify user is at the required physical location' },
                  { type: 'quiz', label: 'Quiz Verification', desc: 'User must pass a quiz to earn points' },
                  { type: 'survey', label: 'Survey Verification', desc: 'User completes a survey questionnaire' },
                  { type: 'ai_survey', label: 'AI Survey/Quiz', desc: 'AI-generated questions based on task category' },
                  { type: 'instant', label: 'Instant / Data Verification', desc: 'Automatic verification against user data' },
                ].map(item => (
                  <div key={item.type} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Badge variant="outline" className="shrink-0 mt-0.5">{item.type}</Badge>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Photo verification submissions would go here */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Screenshot Submissions</CardTitle>
                <CardDescription>Review user-submitted screenshot proofs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-6">
                  Screenshot submissions from tasks will appear here for review. Currently all screenshot tasks are auto-approved on submission.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">GPS Verification Logs</CardTitle>
                <CardDescription>Track GPS-verified task completions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-6">
                  GPS verification logs from location-based tasks will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="mt-4">
            <TransferManagement />
          </TabsContent>

          {/* GPS Tracking Tab */}
          <TabsContent value="gps-tracking" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NavigationIcon className="w-5 h-5 text-primary" />
                  Real-Time GPS Tracking
                </CardTitle>
                <CardDescription>Monitor user locations and movement in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <GPSTrackingDashboard />
              </CardContent>
            </Card>
          </TabsContent>
          {/* Security & Compliance Tab */}
          <TabsContent value="security" className="mt-4 space-y-4">
            <SecurityCompliancePanel users={users} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}