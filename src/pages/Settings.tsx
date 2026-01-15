import { ArrowLeft, User, Bell, Moon, Shield, LogOut, ChevronRight, Save, Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PhoneVerification } from "@/components/auth/PhoneVerification";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  
  const [fullName, setFullName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (userData) {
      setFullName(userData.full_name || '');
    }
  }, [userData]);

  useEffect(() => {
    // Check for dark mode preference
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

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
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update profile');
      console.error(error);
    },
  });

  const handleSaveProfile = () => {
    if (fullName.trim()) {
      updateProfileMutation.mutate(fullName.trim());
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handlePhoneVerified = (phoneNumber: string) => {
    setShowPhoneVerification(false);
    queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    toast.success('Phone number verified successfully!');
  };

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
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Profile Section */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-secondary p-2 rounded-xl">
              <User className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Profile Information</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="rounded-xl bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <Button 
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending || fullName === userData?.full_name}
              className="w-full rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>

        {/* Phone Verification Section */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-secondary p-2 rounded-xl">
              <Phone className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Phone Verification</h3>
          </div>
          
          {showPhoneVerification ? (
            <div className="space-y-4">
              <PhoneVerification
                userId={user?.id}
                onVerified={handlePhoneVerified}
                onSkip={() => setShowPhoneVerification(false)}
                showSkip={true}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-3">
                  {userData?.phone_verified ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {userData?.phone || 'No phone number'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userData?.phone_verified ? 'Verified' : 'Not verified'}
                    </p>
                  </div>
                </div>
                <Badge variant={userData?.phone_verified ? "default" : "secondary"}>
                  {userData?.phone_verified ? '✓ Verified' : 'Unverified'}
                </Badge>
              </div>
              
              <Button 
                onClick={() => setShowPhoneVerification(true)}
                variant={userData?.phone_verified ? "outline" : "default"}
                className="w-full rounded-xl"
              >
                <Phone className="w-4 h-4 mr-2" />
                {userData?.phone_verified ? 'Update Phone Number' : 'Verify Phone Number'}
              </Button>
            </div>
          )}
        </Card>

        {/* Preferences */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <h3 className="font-semibold text-lg mb-4">Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-secondary p-2 rounded-xl">
                  <Moon className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Toggle dark theme</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-secondary p-2 rounded-xl">
                  <Bell className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">Enable push notifications</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <h3 className="font-semibold text-lg mb-4">Security</h3>
          
          <button 
            onClick={() => navigate('/reset-password')}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-secondary p-2 rounded-xl">
                <Shield className="w-5 h-5 text-secondary-foreground" />
              </div>
              <span className="font-medium">Change Password</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full rounded-2xl font-semibold text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
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
