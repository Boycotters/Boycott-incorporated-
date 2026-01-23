import { ArrowLeft, User, Bell, Moon, Shield, LogOut, ChevronRight, Save, Phone, CheckCircle2, AlertCircle, Key, Lock, Calendar, Briefcase, MapPin, CreditCard, HelpCircle, FileText, Info } from "lucide-react";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  
  const [fullName, setFullName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showAdminCodeDialog, setShowAdminCodeDialog] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  
  // Personal info state
  const [nrcNumber, setNrcNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [occupation, setOccupation] = useState('');

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

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (userData) {
      setFullName(userData.full_name || '');
      setNrcNumber((userData as any).nrc_number || '');
      setDateOfBirth((userData as any).date_of_birth || '');
      setGender((userData as any).gender || '');
      setCity((userData as any).city || '');
      setOccupation((userData as any).occupation || '');
    }
  }, [userData]);

  useEffect(() => {
    // Check for dark mode preference
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: {
      full_name?: string;
      nrc_number?: string;
      date_of_birth?: string;
      gender?: string;
      city?: string;
      occupation?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('users')
        .update(updates)
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
      updateProfileMutation.mutate({
        full_name: fullName.trim(),
        nrc_number: nrcNumber.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
        gender: gender || undefined,
        city: city.trim() || undefined,
        occupation: occupation.trim() || undefined,
      });
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

  const handleVerifyAdminCode = async () => {
    if (adminCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsVerifyingCode(true);
    try {
      const { data, error } = await supabase.rpc('verify_admin_access_code', {
        p_user_id: user?.id,
        p_code: adminCode,
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      
      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['is-admin'] });
        setShowAdminCodeDialog(false);
        setAdminCode('');
        // Navigate to admin dashboard after successful verification
        navigate('/admin');
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify code');
    } finally {
      setIsVerifyingCode(false);
    }
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
          </div>
        </Card>

        {/* Personal Information Section */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-secondary p-2 rounded-xl">
              <CreditCard className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Personal Information</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nrc">NRC Number</Label>
              <Input
                id="nrc"
                value={nrcNumber}
                onChange={(e) => setNrcNumber(e.target.value)}
                placeholder="e.g., 123456/10/1"
                className="rounded-xl"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City/Town</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Lusaka"
                  className="rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g., Student"
                  className="rounded-xl"
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
              className="w-full rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProfileMutation.isPending ? 'Saving...' : 'Save All Changes'}
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
          
          <div className="space-y-2">
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

            {/* Admin Access - Always requires PIN */}
            <Dialog open={showAdminCodeDialog} onOpenChange={setShowAdminCodeDialog}>
              <DialogTrigger asChild>
                <button 
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`${isAdmin ? 'bg-primary/10' : 'bg-secondary'} p-2 rounded-xl`}>
                      {isAdmin ? <Key className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-secondary-foreground" />}
                    </div>
                    <div className="text-left">
                      <span className="font-medium">Admin Dashboard</span>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin ? 'Enter PIN to access' : 'Enter access code'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Enter Admin PIN</DialogTitle>
                  <DialogDescription>
                    Enter your 6-digit admin PIN to access the dashboard.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={adminCode}
                      onChange={setAdminCode}
                      disabled={isVerifyingCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button 
                    onClick={handleVerifyAdminCode}
                    disabled={isVerifyingCode || adminCode.length !== 6}
                    className="w-full"
                  >
                    {isVerifyingCode ? 'Verifying...' : 'Unlock Admin Dashboard'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Help & Legal */}
        <Card className="bg-gradient-card p-5 rounded-2xl shadow-card border border-border">
          <h3 className="font-semibold text-lg mb-4">Help & Legal</h3>
          
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/faq')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-secondary p-2 rounded-xl">
                  <HelpCircle className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-medium">FAQ</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button 
              onClick={() => navigate('/terms')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-secondary p-2 rounded-xl">
                  <FileText className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-medium">Terms & Conditions</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button 
              onClick={() => navigate('/privacy')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-secondary p-2 rounded-xl">
                  <Shield className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-medium">Privacy Policy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button 
              onClick={() => navigate('/about')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-secondary p-2 rounded-xl">
                  <Info className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-medium">About Us</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
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