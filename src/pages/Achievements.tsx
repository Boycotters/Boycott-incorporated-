import { ArrowLeft, Trophy, Target, Gift, Users, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
}

interface UserAchievement {
  achievement_id: string;
  earned_at: string | null;
}

export default function Achievements() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch all achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('requirement_value', { ascending: true });
      
      if (error) throw error;
      return data as Achievement[];
    },
  });

  // Fetch user's earned achievements
  const { data: userAchievements } = useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as UserAchievement[];
    },
    enabled: !!user?.id,
  });

  // Fetch user stats for progress
  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const [tasksResult, userResult, referralsResult] = await Promise.all([
        supabase
          .from('user_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('users')
          .select('total_points, level')
          .eq('id', user.id)
          .single(),
        supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', user.id),
      ]);
      
      return {
        tasksCompleted: tasksResult.count || 0,
        totalPoints: userResult.data?.total_points || 0,
        level: userResult.data?.level || 1,
        referralsMade: referralsResult.count || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Check achievements on page load
  useQuery({
    queryKey: ['check-achievements', user?.id],
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

  const isEarned = (achievementId: string) => {
    return userAchievements?.some(ua => ua.achievement_id === achievementId);
  };

  const getProgress = (achievement: Achievement): number => {
    if (!userStats) return 0;
    
    let current = 0;
    switch (achievement.requirement_type) {
      case 'tasks_completed':
        current = userStats.tasksCompleted;
        break;
      case 'points_earned':
        current = userStats.totalPoints;
        break;
      case 'referrals_made':
        current = userStats.referralsMade;
        break;
      case 'level_reached':
        current = userStats.level;
        break;
    }
    
    return Math.min((current / achievement.requirement_value) * 100, 100);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tasks': return <Target className="w-5 h-5" />;
      case 'points': return <Trophy className="w-5 h-5" />;
      case 'referrals': return <Users className="w-5 h-5" />;
      case 'levels': return <TrendingUp className="w-5 h-5" />;
      default: return <Gift className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tasks': return 'bg-blue-500/20 text-blue-500';
      case 'points': return 'bg-yellow-500/20 text-yellow-500';
      case 'referrals': return 'bg-green-500/20 text-green-500';
      case 'levels': return 'bg-purple-500/20 text-purple-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const groupedAchievements = achievements?.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const categoryLabels: Record<string, string> = {
    tasks: 'Task Achievements',
    points: 'Points Achievements',
    referrals: 'Referral Achievements',
    levels: 'Level Achievements',
  };

  const earnedCount = userAchievements?.length || 0;
  const totalCount = achievements?.length || 0;

  if (achievementsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Achievements</h1>
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-primary p-6 rounded-3xl shadow-hover border-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-bold mb-1">Your Progress</h2>
              <p className="text-white/80">
                {earnedCount} of {totalCount} achievements unlocked
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <Progress 
            value={(earnedCount / totalCount) * 100} 
            className="h-3 bg-white/20"
          />
        </Card>

        {/* Achievement Categories */}
        {groupedAchievements && Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${getCategoryColor(category)}`}>
                {getCategoryIcon(category)}
              </div>
              <h3 className="text-lg font-semibold">{categoryLabels[category] || category}</h3>
            </div>

            <div className="space-y-3">
              {categoryAchievements.map((achievement) => {
                const earned = isEarned(achievement.id);
                const progress = getProgress(achievement);
                
                return (
                  <Card 
                    key={achievement.id}
                    className={`p-4 rounded-2xl shadow-card border transition-all duration-300 ${
                      earned 
                        ? 'bg-gradient-accent border-0' 
                        : 'bg-gradient-card border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-3xl p-2 rounded-xl ${
                        earned ? 'bg-white/20' : 'bg-secondary'
                      }`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-semibold ${earned ? 'text-white' : ''}`}>
                            {achievement.name}
                          </h4>
                          {earned ? (
                            <Badge className="bg-white/20 text-white border-0">
                              Unlocked
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              +{achievement.points_reward} pts
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm mb-2 ${
                          earned ? 'text-white/80' : 'text-muted-foreground'
                        }`}>
                          {achievement.description}
                        </p>
                        {!earned && (
                          <Progress value={progress} className="h-2" />
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
