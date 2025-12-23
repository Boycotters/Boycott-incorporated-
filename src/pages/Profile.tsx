import { Settings, Trophy, Target, Zap, ChevronRight, Award, Gift, LogOut, BarChart3, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Achievement {
  id: string;
  name: string;
  icon: string;
}

interface UserAchievement {
  achievement_id: string;
  achievements: Achievement;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = userData?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  const memberSince = userData?.created_at 
    ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently';

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Profile</h1>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="bg-gradient-primary p-6 rounded-3xl shadow-hover border-0">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-20 h-20 border-4 border-white/20">
              <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-white text-2xl font-bold mb-1">
                {userData?.full_name || 'User'}
              </h2>
              <p className="text-white/80">Member since {memberSince}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm px-4 py-3 rounded-2xl">
            <div>
              <p className="text-white/80 text-sm">Level {userData?.level || 1}</p>
              <p className="text-white font-bold text-xl">
                {userData?.wallets?.[0]?.available_points || 0} pts
              </p>
            </div>
            <Button
              size="sm"
              className="bg-white text-primary hover:bg-white/90 font-bold rounded-xl"
            >
              View Rank
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border text-center">
            <div className="bg-secondary p-2 rounded-xl inline-flex mb-2">
              <Target className="w-5 h-5 text-secondary-foreground" />
            </div>
            <p className="font-bold text-lg">{completedTasks || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Tasks Completed</p>
          </Card>
          <Card className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border text-center">
            <div className="bg-secondary p-2 rounded-xl inline-flex mb-2">
              <Zap className="w-5 h-5 text-secondary-foreground" />
            </div>
            <p className="font-bold text-lg">{userData?.total_points || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Points</p>
          </Card>
          <Card className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border text-center">
            <div className="bg-secondary p-2 rounded-xl inline-flex mb-2">
              <Gift className="w-5 h-5 text-secondary-foreground" />
            </div>
            <p className="font-bold text-lg">{userData?.level || 1}</p>
            <p className="text-xs text-muted-foreground mt-1">Current Level</p>
          </Card>
        </div>

        {/* Achievements */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Achievements</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-xl"
              onClick={() => navigate('/achievements')}
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {userAchievements && userAchievements.length > 0 ? (
              userAchievements.map((ua) => (
                <Card
                  key={ua.achievement_id}
                  className="p-3 rounded-2xl shadow-card border-0 bg-gradient-accent hover:scale-105 transition-all duration-300"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-1">{ua.achievements?.icon}</div>
                    <p className="text-xs font-medium text-white">
                      {ua.achievements?.name}
                    </p>
                  </div>
                </Card>
              ))
            ) : (
              <Card
                className="col-span-4 p-4 rounded-2xl shadow-card border border-border bg-muted/30 text-center"
              >
                <p className="text-sm text-muted-foreground">
                  Complete tasks to unlock achievements!
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {[
            { label: "VIP Status", icon: Crown, path: "/vip" },
            { label: "Analytics Dashboard", icon: BarChart3, path: "/analytics" },
            { label: "Transaction History", icon: Trophy, path: "/transactions" },
            { label: "Referral Program", icon: Award, path: "/referrals" },
            { label: "Settings & Privacy", icon: Settings, path: "/settings" },
          ].map((item, index) => (
            <Card
              key={index}
              onClick={() => navigate(item.path)}
              className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border hover:shadow-hover transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-secondary p-2 rounded-xl">
                    <item.icon className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <span className="font-semibold">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>

        {/* Sign Out Button */}
        <Button
          variant="outline"
          className="w-full rounded-2xl font-semibold"
          size="lg"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
