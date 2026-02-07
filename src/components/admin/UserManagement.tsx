import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Phone, PhoneCall, Shield, ShieldCheck, Ban, CheckCircle2, XCircle, Copy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { format } from "date-fns";

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

interface UserManagementProps {
  users: User[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function UserManagement({ users, searchQuery, onSearchChange }: UserManagementProps) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [verifyPhoneDialogOpen, setVerifyPhoneDialogOpen] = useState(false);

  // Copy phone number to clipboard
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
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Verify phone mutation
  const verifyPhoneMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const { error } = await supabase
        .from('users')
        .update({ phone_verified: verified })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Phone verification status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setVerifyPhoneDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleBanUser = (user: User) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };

  const handleVerifyPhone = (user: User) => {
    setSelectedUser(user);
    setVerifyPhoneDialogOpen(true);
  };

  const usersWithPhones = users.filter(u => u.phone);
  const unverifiedPhones = users.filter(u => u.phone && !u.phone_verified);

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
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Verification Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{unverifiedPhones.length}</p>
              <p className="text-xs text-muted-foreground">Pending verification</p>
            </div>
            <Badge variant="secondary">
              {usersWithPhones.length} users with phones
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Users requiring phone verification */}
      {unverifiedPhones.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
              <PhoneCall className="w-4 h-4" />
              Awaiting Phone Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {unverifiedPhones.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{user.phone}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyToClipboard(user.phone!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => handleVerifyPhone(user)}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Verify
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* User Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[150px]">
                              {user.full_name || 'No name'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <div className="flex items-center gap-1">
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
                          <span className="text-xs text-muted-foreground">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{user.total_points || 0}</p>
                          <p className="text-xs text-muted-foreground">Lvl {user.level || 1}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {user.is_banned ? (
                            <Badge variant="destructive" className="text-xs w-fit">Banned</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs w-fit">Active</Badge>
                          )}
                          {user.vip_tier && user.vip_tier !== 'bronze' && (
                            <Badge variant="outline" className="text-xs w-fit capitalize">{user.vip_tier}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {user.phone && !user.phone_verified && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600"
                              onClick={() => handleVerifyPhone(user)}
                              title="Verify phone"
                            >
                              <ShieldCheck className="w-4 h-4" />
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.is_banned ? 'Unban User' : 'Ban User'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.is_banned 
                ? `Are you sure you want to unban ${selectedUser?.email}?`
                : `This will prevent ${selectedUser?.email} from accessing the app.`
              }
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
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
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
            <DialogTitle>Verify Phone Number</DialogTitle>
            <DialogDescription>
              Confirm that you have verified this user's phone number.
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(selectedUser.phone!)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Joined:</span>
                  <span className="text-sm">
                    {selectedUser.created_at ? format(new Date(selectedUser.created_at), 'MMM d, yyyy') : 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setVerifyPhoneDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => {
                    verifyPhoneMutation.mutate({
                      userId: selectedUser.id,
                      verified: true
                    });
                  }}
                  disabled={verifyPhoneMutation.isPending}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {verifyPhoneMutation.isPending ? 'Verifying...' : 'Confirm Verification'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}