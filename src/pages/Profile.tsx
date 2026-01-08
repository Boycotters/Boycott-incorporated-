import { 
  Settings, Trophy, Target, Zap, ChevronRight, Award, Gift, LogOut, 
  BarChart3, Crown, Flame, Users, Copy, Check, Edit3, Phone, Mail,
  Calendar, TrendingUp, Star, Package
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserInventory } from "@/components/profile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Achievement {
  id: string;
  name: string;
  icon: string;
}

interface UserAchievement {
  achievement_id: string;
  achievements: Achievement;
}

interface VipTier {
  name: string;
  slug: string;
  multiplier: number;
  icon: string;
  color: string;
  min_points: number;
  daily_task_bonus: number;
  benefits: string[];
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { data: userData } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*, wallets(*)')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch VIP tier info
  const { data: vipTier } = useQuery({
    queryKey: ['profile-vip-tier', userData?.vip_tier],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_tiers')
        .select('*')
        .eq('slug', userData?.vip_tier || 'bronze')
        .single();
      
      if (error) throw error;
      return data as VipTier;
    },
    enabled: !!userData?.vip_tier,
  });

  // Fetch next VIP tier
  const { data: nextVipTier } = useQuery({
    queryKey: ['profile-next-vip-tier', userData?.total_points],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_tiers')
        .select('*')
        .gt('min_points', userData?.total_points || 0)
        .order('min_points', { ascending: true })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as VipTier | null;
    },
    enabled: !!userData,
  });

  const { data: completedTasks } = useQuery({
    queryKey: ['completed-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch referral stats
  const { data: referralStats } = useQuery({
    queryKey: ['profile-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0, totalBonus: 0 };
      const { data, error } = await supabase
        .from('referrals')
        .select('bonus_points')
        .eq('referrer_id', user.id);
      
      if (error) throw error;
      return {
        count: data?.length || 0,
        totalBonus: data?.reduce((sum, r) => sum + r.bonus_points, 0) || 0
      };
    },
    enabled: !!user?.id,
  });

  // Fetch user's earned achievements (latest 4)
  const { data: userAchievements } = useQuery({
    queryKey: ['profile-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          achievement_id,
          achievements (id, name, icon)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data as UserAchievement[];
    },
    enabled: !!user?.id,
  });

  // Check achievements on profile load
  useQuery({
    queryKey: ['check-profile-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase.rpc('check_and_award_achievements', {
        p_user_id: user.id
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('users')
        .update({ full_name: newName })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setEditOpen(false);
      toast.success('Profile updated!');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const handleSignOut = async () => {
    await signOut();
  };

  const copyReferralCode = () => {
    if (userData?.referral_code) {
      navigator.clipboard.writeText(userData.referral_code);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditProfile = () => {
    setEditName(userData?.full_name || '');
    setEditOpen(true);
  };

  const handleSaveProfile = () => {
    if (editName.trim()) {
      updateProfileMutation.mutate(editName.trim());
    }
  };

  const initials = userData?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  const memberSince = userData?.created_at 
    ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently';

  const currentStreak = userData?.current_streak || 0;
  const longestStreak = userData?.longest_streak || 0;
  const level = userData?.level || 1;
  const totalPoints = userData?.total_points || 0;
  
  const currentLevelPoints = totalPoints % 1000;
  const progressToNextLevel = (currentLevelPoints / 1000) * 100;
  const pointsToNextLevel = 1000 - currentLevelPoints;

  const progressToNextTier = nextVipTier 
    ? Math.min(100, ((totalPoints) - (vipTier?.min_points || 0)) / (nextVipTier.min_points - (vipTier?.min_points || 0)) * 100)
    : 100;

  const getTierGradient = (slug: string) => {
    switch (slug) {
      case 'bronze': return 'from-amber-700 to-amber-500';
      case 'silver': return 'from-slate-400 to-slate-300';
      case 'gold': return 'from-yellow-500 to-amber-300';
      case 'diamond': return 'from-cyan-400 to-blue-300';
      default: return 'from-primary to-primary/80';
    }
  };

  // Weekly goal (example: 500 points per week)
  const weeklyGoal = 500;
  const { data: weeklyPoints } = useQuery({
    queryKey: ['weekly-points', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('user_tasks')
        .select('points_earned')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo.toISOString());
      
      if (error) throw error;
      return data?.reduce((sum, t) => sum + (t.points_earned || 0), 0) || 0;
    },
    enabled: !!user?.id,
  });

  const weeklyProgress = Math.min(100, ((weeklyPoints || 0) / weeklyGoal) * 100);

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
      <div className="max-w-md mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Card with VIP Badge */}
        <Card className={`bg-gradient-to-br ${getTierGradient(vipTier?.slug || 'bronze')} p-4 rounded-2xl shadow-hover border-0 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative">
                <Avatar className="w-16 h-16 border-3 border-white/30">
                  <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                  <span className="text-sm">{vipTier?.icon || '🥉'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-white text-lg font-bold truncate">
                    {userData?.full_name || 'User'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/20"
                    onClick={handleEditProfile}
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="bg-white/20 text-white border-0 text-[10px] h-5">
                    {vipTier?.name || 'Bronze'}
                  </Badge>
                  {userData?.is_verified && (
                    <Badge className="bg-green-500/80 text-white border-0 text-[10px] h-5">
                      <Check className="w-2.5 h-2.5 mr-0.5" /> Verified
                    </Badge>
                  )}
                </div>
                <p className="text-white/70 text-xs mt-1">Member since {memberSince}</p>
              </div>
            </div>

            {/* Level Progress */}
            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-300" />
                  <span className="text-white text-xs font-medium">Level {level}</span>
                </div>
                <span className="text-white/70 text-[10px]">{pointsToNextLevel} pts to Level {level + 1}</span>
              </div>
              <Progress value={progressToNextLevel} className="h-1.5 bg-white/20" />
            </div>
          </div>
        </Card>

        {/* Streak & Multiplier Row */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="w-4 h-4 text-white" />
                <span className="text-white/80 text-[10px] font-medium">Streak</span>
              </div>
              <p className="text-white text-xl font-bold">{currentStreak}</p>
              <p className="text-white/60 text-[10px]">Best: {longestStreak} days</p>
            </div>
          </Card>
          
          <Card className={`bg-gradient-to-br ${getTierGradient(vipTier?.slug || 'bronze')} p-3 rounded-xl border-0 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-4 h-4 text-white" />
                <span className="text-white/80 text-[10px] font-medium">Multiplier</span>
              </div>
              <p className="text-white text-xl font-bold">{vipTier?.multiplier || 1}x</p>
              <p className="text-white/60 text-[10px]">+{vipTier?.daily_task_bonus || 0} daily bonus</p>
            </div>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border text-center">
            <div className="bg-secondary p-1.5 rounded-lg inline-flex mb-1">
              <Target className="w-4 h-4 text-secondary-foreground" />
            </div>
            <p className="font-bold text-base">{completedTasks || 0}</p>
            <p className="text-[10px] text-muted-foreground">Tasks</p>
          </Card>
          <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border text-center">
            <div className="bg-secondary p-1.5 rounded-lg inline-flex mb-1">
              <Trophy className="w-4 h-4 text-secondary-foreground" />
            </div>
            <p className="font-bold text-base">{totalPoints.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Points</p>
          </Card>
          <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border text-center">
            <div className="bg-secondary p-1.5 rounded-lg inline-flex mb-1">
              <Users className="w-4 h-4 text-secondary-foreground" />
            </div>
            <p className="font-bold text-base">{referralStats?.count || 0}</p>
            <p className="text-[10px] text-muted-foreground">Referrals</p>
          </Card>
        </div>

        {/* Weekly Goal */}
        <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="bg-purple-500/10 p-1.5 rounded-lg">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Weekly Goal</p>
                <p className="text-[10px] text-muted-foreground">{weeklyPoints || 0} / {weeklyGoal} pts</p>
              </div>
            </div>
            {weeklyProgress >= 100 && (
              <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">
                ✓ Complete
              </Badge>
            )}
          </div>
          <Progress value={weeklyProgress} className="h-2" />
        </Card>

        {/* Referral Code */}
        <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-500/10 p-1.5 rounded-lg">
                <Gift className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Referral Code</p>
                <p className="font-bold font-mono text-base">{userData?.referral_code || '------'}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-lg h-8"
              onClick={copyReferralCode}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          {referralStats && referralStats.count > 0 && (
            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{referralStats.count} friends invited</span>
              <span className="text-green-600 font-medium">+{referralStats.totalBonus} bonus pts</span>
            </div>
          )}
        </Card>

        {/* VIP Progress */}
        {nextVipTier && (
          <Card 
            className="bg-gradient-card p-3 rounded-xl shadow-card border border-border cursor-pointer hover:shadow-hover transition-all"
            onClick={() => navigate('/vip')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{vipTier?.icon || '🥉'}</span>
                <div>
                  <p className="text-xs text-muted-foreground">Progress to {nextVipTier.name}</p>
                  <p className="text-sm font-semibold">{(nextVipTier.min_points - totalPoints).toLocaleString()} pts needed</p>
                </div>
              </div>
              <span className="text-lg">{nextVipTier.icon}</span>
            </div>
            <Progress value={progressToNextTier} className="h-2" />
          </Card>
        )}

        {/* Achievements */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Achievements</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-lg h-7 text-[10px]"
              onClick={() => navigate('/achievements')}
            >
              View All
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {userAchievements && userAchievements.length > 0 ? (
              userAchievements.map((ua) => (
                <Card
                  key={ua.achievement_id}
                  className="p-2 rounded-xl shadow-card border-0 bg-gradient-accent hover:scale-105 transition-all duration-300"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-0.5">{ua.achievements?.icon}</div>
                    <p className="text-[9px] font-medium text-white truncate">
                      {ua.achievements?.name}
                    </p>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="col-span-4 p-3 rounded-xl shadow-card border border-border bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">
                  Complete tasks to unlock achievements!
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Account Info */}
        <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-secondary p-1.5 rounded-lg">
              <Mail className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Email</p>
              <p className="text-sm font-medium truncate">{userData?.email || user?.email}</p>
            </div>
          </div>
          {userData?.phone && (
            <div className="flex items-center gap-3">
              <div className="bg-secondary p-1.5 rounded-lg">
                <Phone className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{userData.phone}</p>
              </div>
              {userData.is_verified && (
                <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">
                  Verified
                </Badge>
              )}
            </div>
          )}
        </Card>

        {/* Notifications Toggle */}
        <Card className="bg-gradient-card p-3 rounded-xl shadow-card border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-secondary p-1.5 rounded-lg">
                <Gift className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-[10px] text-muted-foreground">Reminders & rewards</p>
              </div>
            </div>
            <Switch 
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </Card>

        {/* Menu Items */}
        <div className="space-y-1.5">
          {[
            { label: "VIP Status", icon: Crown, path: "/vip", badge: vipTier?.name },
            { label: "Analytics", icon: BarChart3, path: "/analytics" },
            { label: "Transactions", icon: Trophy, path: "/transactions" },
            { label: "Referrals", icon: Award, path: "/referrals", badge: referralStats?.count ? `${referralStats.count}` : undefined },
            { label: "Settings", icon: Settings, path: "/settings" },
          ].map((item) => (
            <Card
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-gradient-card p-3 rounded-xl shadow-card border border-border hover:shadow-hover transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-secondary p-1.5 rounded-lg">
                    <item.icon className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Sign Out Button */}
        <Button
          variant="outline"
          className="w-full rounded-xl font-semibold h-11"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
