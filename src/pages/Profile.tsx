import { Settings, Trophy, Target, Zap, ChevronRight, Award, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const achievements = [
  { id: 1, name: "First Steps", icon: "🎯", earned: true },
  { id: 2, name: "Streak Master", icon: "🔥", earned: true },
  { id: 3, name: "Social Star", icon: "⭐", earned: false },
  { id: 4, name: "Task Champion", icon: "🏆", earned: true },
];

const stats = [
  { label: "Tasks Completed", value: "156", icon: Target },
  { label: "Current Streak", value: "12 days", icon: Zap },
  { label: "Rewards Claimed", value: "8", icon: Gift },
];

export default function Profile() {
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
                JD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-white text-2xl font-bold mb-1">John Doe</h2>
              <p className="text-white/80">Member since Jan 2024</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm px-4 py-3 rounded-2xl">
            <div>
              <p className="text-white/80 text-sm">Level 5</p>
              <p className="text-white font-bold text-xl">2,450 pts</p>
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
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="bg-gradient-card p-4 rounded-2xl shadow-card border border-border text-center"
            >
              <div className="bg-secondary p-2 rounded-xl inline-flex mb-2">
                <stat.icon className="w-5 h-5 text-secondary-foreground" />
              </div>
              <p className="font-bold text-lg">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Achievements */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Achievements</h3>
            <Button variant="ghost" size="sm" className="rounded-xl">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {achievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={`p-3 rounded-2xl shadow-card border transition-all duration-300 ${
                  achievement.earned
                    ? "bg-gradient-accent border-0 hover:scale-105"
                    : "bg-muted/30 border-border opacity-50"
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-1">{achievement.icon}</div>
                  <p className={`text-xs font-medium ${achievement.earned ? "text-white" : "text-muted-foreground"}`}>
                    {achievement.name}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {[
            { label: "Transaction History", icon: Trophy },
            { label: "Referral Program", icon: Award },
            { label: "Settings & Privacy", icon: Settings },
          ].map((item, index) => (
            <Card
              key={index}
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
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
