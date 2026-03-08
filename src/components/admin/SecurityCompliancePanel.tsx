import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, AlertTriangle, CalendarClock, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  total_points: number | null;
  vip_tier: string | null;
  is_banned: boolean | null;
}

interface SecurityCompliancePanelProps {
  users: User[];
}

export function SecurityCompliancePanel({ users }: SecurityCompliancePanelProps) {
  const [checkingFraud, setCheckingFraud] = useState<string | null>(null);
  const [checkingExpiry, setCheckingExpiry] = useState<string | null>(null);
  const [fraudResults, setFraudResults] = useState<Record<string, any>>({});
  const [expiryResults, setExpiryResults] = useState<Record<string, any>>({});

  // Fetch streak shields
  const { data: streakShields = [], refetch: refetchShields } = useQuery({
    queryKey: ['admin-streak-shields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streak_shields')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent fraud logs
  const { data: fraudLogs = [], refetch: refetchFraudLogs } = useQuery({
    queryKey: ['admin-fraud-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .eq('action', 'fraud_flag_redemption')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const checkFraud = async (userId: string) => {
    setCheckingFraud(userId);
    try {
      const { data, error } = await supabase.rpc('check_redemption_fraud', { p_user_id: userId });
      if (error) throw error;
      setFraudResults(prev => ({ ...prev, [userId]: data }));
      const result = data as any;
      if (result?.flagged) {
        toast.warning(`User flagged: ${result.recent_count} redemptions in 24h`);
      } else {
        toast.success(`No fraud detected (${result?.recent_count || 0} redemptions in 24h)`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCheckingFraud(null);
    }
  };

  const checkExpiry = async (userId: string) => {
    setCheckingExpiry(userId);
    try {
      const { data, error } = await supabase.rpc('check_point_expiry_status', { p_user_id: userId });
      if (error) throw error;
      setExpiryResults(prev => ({ ...prev, [userId]: data }));
      const result = data as any;
      if (result?.at_risk) {
        toast.warning(`User at risk: ${result.months_inactive} months inactive`);
      } else {
        toast.success(`Active user (${result?.months_inactive || 0} months since last activity)`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCheckingExpiry(null);
    }
  };

  const getUserEmail = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.email || user?.full_name || userId.slice(0, 8);
  };

  return (
    <div className="space-y-4">
      {/* Fraud Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Fraud Detection (SEC-004)
          </CardTitle>
          <CardDescription>
            Check users for suspicious redemption activity (3+ in 24h threshold)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recent fraud flags */}
          {fraudLogs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Fraud Flags</p>
              {fraudLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{getUserEmail(log.entity_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.details?.reason} — Count: {log.details?.count}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">Flagged</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Check specific users */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Check User Fraud Status</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.slice(0, 20).map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm">{u.full_name || u.email}</TableCell>
                    <TableCell className="text-sm">{u.total_points?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {fraudResults[u.id] ? (
                        <Badge variant={fraudResults[u.id].flagged ? "destructive" : "secondary"}>
                          {fraudResults[u.id].flagged ? `Flagged (${fraudResults[u.id].recent_count})` : 'Clean'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not checked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={checkingFraud === u.id}
                        onClick={() => checkFraud(u.id)}
                      >
                        {checkingFraud === u.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Check'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Point Expiry Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-yellow-500" />
            Point Expiry Monitor (FR-PTS-006)
          </CardTitle>
          <CardDescription>
            12-month inactivity policy — users inactive for 10+ months are flagged at-risk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 20).map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm">{u.full_name || u.email}</TableCell>
                  <TableCell className="text-sm">{u.total_points?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    {expiryResults[u.id] ? (
                      <Badge variant={expiryResults[u.id].at_risk ? "destructive" : "secondary"}>
                        {expiryResults[u.id].at_risk
                          ? `At Risk (${expiryResults[u.id].months_inactive}mo)`
                          : `Active (${expiryResults[u.id].months_inactive}mo)`}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not checked</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={checkingExpiry === u.id}
                      onClick={() => checkExpiry(u.id)}
                    >
                      {checkingExpiry === u.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Check'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Streak Shields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Streak Shield Usage (FR-STRK-004)
          </CardTitle>
          <CardDescription>
            VIP streak shield activations — Platinum & Diamond members get 1 per month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {streakShields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No streak shields have been used yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streakShields.map((shield: any) => (
                  <TableRow key={shield.id}>
                    <TableCell className="text-sm">{getUserEmail(shield.user_id)}</TableCell>
                    <TableCell className="text-sm">{shield.month_year}</TableCell>
                    <TableCell>
                      <Badge variant={shield.used_at ? "default" : "secondary"}>
                        {shield.used_at ? 'Used' : 'Available'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {shield.used_at
                        ? new Date(shield.used_at).toLocaleDateString()
                        : new Date(shield.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
