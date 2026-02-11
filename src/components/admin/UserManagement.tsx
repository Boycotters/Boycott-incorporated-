import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Phone, PhoneCall, Shield, ShieldCheck, Ban, CheckCircle2, XCircle, Copy, User, Users, MapPin, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface UserData {
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

interface UserManagementProps {
  users: UserData[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function UserManagement({ users, searchQuery, onSearchChange }: UserManagementProps) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [verifyPhoneDialogOpen, setVerifyPhoneDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Ban/Unban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, isBanned, reason }: { userId: string; isBanned: boolean; reason?: string }) => {
      const { data, error } = await supabase.rpc('admin_ban_user', {
        p_user_id: userId,
        p_is_banned: isBanned,
        p_ban_reason: reason || null
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        setBanDialogOpen(false);
        setBanReason('');
        setSelectedUser(null);
      } else {
        toast.error(data?.message || 'Operation failed');
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Verify phone mutation - uses secure admin RPC
  const verifyPhoneMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const { data, error } = await supabase.rpc('admin_verify_phone' as any, {
        p_user_id: userId,
        p_verified: verified
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        setVerifyPhoneDialogOpen(false);
        setSelectedUser(null);
      } else {
        toast.error(data?.message || 'Failed to update verification');
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleBanUser = (user: UserData) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };

  const handleVerifyPhone = (user: UserData) => {
    setSelectedUser(user);
    setVerifyPhoneDialogOpen(true);
  };

  const usersWithPhones = users.filter(u => u.phone);
  const unverifiedPhones = users.filter(u => u.phone && !u.phone_verified);
  const verifiedPhones = users.filter(u => u.phone && u.phone_verified);

  const getFilteredUsers = () => {
    switch (activeTab) {
      case 'unverified': return unverifiedPhones;
      case 'verified': return verifiedPhones;
      default: return users;
    }
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Phone Verification Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-orange-600">{unverifiedPhones.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{verifiedPhones.length}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({users.length})</TabsTrigger>
          <TabsTrigger value="unverified">Pending ({unverifiedPhones.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verifiedPhones.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* User List - Full scrollable */}
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No users found
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || 'No name'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                      {user.phone ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-mono">{user.phone}</span>
                          {user.phone_verified ? (
                            <ShieldCheck className="w-3 h-3 text-green-500" />
                          ) : (
                            <Shield className="w-3 h-3 text-orange-500" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(user.phone!)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">No phone</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {user.total_points || 0} pts • Lvl {user.level || 1}
                        </span>
                        {user.is_banned && (
                          <Badge variant="destructive" className="text-[10px] h-4">Banned</Badge>
                        )}
                        {user.created_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Joined {format(new Date(user.created_at), 'MMM d, yy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {user.phone && !user.phone_verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-green-600 border-green-300"
                        onClick={() => handleVerifyPhone(user)}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Verify
                      </Button>
                    )}
                    {user.phone && user.phone_verified && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-orange-600"
                        onClick={() => handleVerifyPhone(user)}
                        title="Revoke verification"
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 w-7 p-0 ${user.is_banned ? 'text-green-600' : 'text-red-600'}`}
                      onClick={() => handleBanUser(user)}
                      title={user.is_banned ? 'Unban user' : 'Ban user'}
                    >
                      {user.is_banned ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser?.is_banned ? 'Unban User' : 'Ban User'}</DialogTitle>
            <DialogDescription>
              {selectedUser?.is_banned 
                ? `Are you sure you want to unban ${selectedUser?.email}?`
                : `This will prevent ${selectedUser?.email} from accessing the app.`}
            </DialogDescription>
          </DialogHeader>
          {!selectedUser?.is_banned && (
            <div className="space-y-2">
              <Label>Reason for ban</Label>
              <Textarea
                placeholder="Enter reason for banning this user..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button
              variant={selectedUser?.is_banned ? "default" : "destructive"}
              onClick={() => {
                if (selectedUser) {
                  banUserMutation.mutate({
                    userId: selectedUser.id,
                    isBanned: !selectedUser.is_banned,
                    reason: banReason
                  });
                }
              }}
              disabled={banUserMutation.isPending}
            >
              {banUserMutation.isPending ? 'Processing...' : (selectedUser?.is_banned ? 'Unban' : 'Ban User')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Phone Dialog */}
      <Dialog open={verifyPhoneDialogOpen} onOpenChange={setVerifyPhoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.phone_verified ? 'Revoke Phone Verification' : 'Verify Phone Number'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.phone_verified 
                ? 'Remove verification status from this user.'
                : 'Confirm that you have verified this user\'s phone number.'}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">User:</span>
                  <span className="text-sm font-medium">{selectedUser.full_name || selectedUser.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium">{selectedUser.phone}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedUser.phone!)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={selectedUser.phone_verified ? "default" : "secondary"}>
                    {selectedUser.phone_verified ? '✓ Verified' : 'Unverified'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Joined:</span>
                  <span className="text-sm">
                    {selectedUser.created_at ? format(new Date(selectedUser.created_at), 'MMM d, yyyy') : 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setVerifyPhoneDialogOpen(false)}>Cancel</Button>
                <Button
                  className="gap-2"
                  variant={selectedUser.phone_verified ? "destructive" : "default"}
                  onClick={() => {
                    verifyPhoneMutation.mutate({
                      userId: selectedUser.id,
                      verified: !selectedUser.phone_verified
                    });
                  }}
                  disabled={verifyPhoneMutation.isPending}
                >
                  {selectedUser.phone_verified ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      {verifyPhoneMutation.isPending ? 'Removing...' : 'Remove Verification'}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {verifyPhoneMutation.isPending ? 'Verifying...' : 'Confirm Verification'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
