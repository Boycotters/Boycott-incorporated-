import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Plus, Send, Clock, CheckCircle2, Trash2, Users, Loader2, Zap, Calendar, Settings as SettingsIcon } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  target_audience: string;
  channel: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  sent_count: number;
  metadata: any;
  created_by: string | null;
  created_at: string;
}

const AUTO_RULES_KEY = "admin_auto_notification_rules";

interface AutoRules {
  welcome: boolean;
  dailyStreak: boolean;
  streakBreak: boolean;
  inactiveUsers: boolean;
  withdrawalStatus: boolean;
  taskComplete: boolean;
  capReminder: boolean;
  weekendCampaign: boolean;
  inactivityHours: number;
  digestEnabled: boolean;
  digestHour: number;
}

const defaultRules: AutoRules = {
  welcome: true,
  dailyStreak: true,
  streakBreak: true,
  inactiveUsers: false,
  withdrawalStatus: true,
  taskComplete: false,
  capReminder: true,
  weekendCampaign: true,
  inactivityHours: 48,
  digestEnabled: true,
  digestHour: 9,
};

export function NotificationManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [autoRules, setAutoRules] = useState<AutoRules>(() => {
    try {
      const stored = localStorage.getItem(AUTO_RULES_KEY);
      return stored ? { ...defaultRules, ...JSON.parse(stored) } : defaultRules;
    } catch {
      return defaultRules;
    }
  });
  const [newNotification, setNewNotification] = useState({
    title: "",
    body: "",
    target_audience: "all",
    channel: "in_app",
    scheduled_for: "",
  });

  const updateRule = <K extends keyof AutoRules>(key: K, value: AutoRules[K]) => {
    const next = { ...autoRules, [key]: value };
    setAutoRules(next);
    localStorage.setItem(AUTO_RULES_KEY, JSON.stringify(next));
    toast.success("Auto setting saved");
  };

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: async (notification: typeof newNotification) => {
      const isScheduled = !!notification.scheduled_for;
      const { error } = await supabase.from("notifications").insert({
        title: notification.title,
        body: notification.body,
        target_audience: notification.target_audience,
        channel: notification.channel,
        scheduled_for: isScheduled ? new Date(notification.scheduled_for).toISOString() : null,
        created_by: user?.id,
        status: isScheduled ? "scheduled" : "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification created");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      setCreateOpen(false);
      setNewNotification({ title: "", body: "", target_audience: "all", channel: "in_app", scheduled_for: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMutation = useMutation({
    mutationFn: async (n: Notification) => {
      // Real-time fan-out via push function (best effort)
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: n.title,
            body: n.body,
            audience: n.target_audience,
            channel: n.channel,
          },
        });
      } catch (_) {}
      const { error } = await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification sent");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge className="bg-green-500/10 text-green-600">Sent</Badge>;
      case "scheduled": return <Badge className="bg-blue-500/10 text-blue-600">Scheduled</Badge>;
      default: return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const ruleItems: { key: keyof AutoRules; label: string; description: string }[] = [
    { key: "welcome", label: "Welcome new users", description: "Auto-send when a user signs up." },
    { key: "dailyStreak", label: "Daily streak reminders", description: "Nudge users to keep their streak alive." },
    { key: "streakBreak", label: "Streak about to break", description: "Send 2h before midnight if no activity." },
    { key: "inactiveUsers", label: "Inactive users re-engagement", description: "Win-back message after inactivity." },
    { key: "withdrawalStatus", label: "Withdrawal updates", description: "Approval, rejection, processing." },
    { key: "taskComplete", label: "Task completed", description: "Confirm reward & next task suggestion." },
    { key: "capReminder", label: "Daily cap reached", description: "Notify when limit hit + come back tomorrow." },
    { key: "weekendCampaign", label: "Weekend campaign live", description: "Auto-broadcast when campaign starts." },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Center
              </CardTitle>
              <CardDescription>Real-time, scheduled & automated notifications</CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Notification</DialogTitle>
                  <DialogDescription>Send instantly or schedule for a future time.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newNotification.title}
                      onChange={(e) => setNewNotification(p => ({ ...p, title: e.target.value }))}
                      placeholder="Notification title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                      value={newNotification.body}
                      onChange={(e) => setNewNotification(p => ({ ...p, body: e.target.value }))}
                      placeholder="Notification message..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Audience</Label>
                      <Select
                        value={newNotification.target_audience}
                        onValueChange={(v) => setNewNotification(p => ({ ...p, target_audience: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="vip">VIP Only</SelectItem>
                          <SelectItem value="active">Active Users</SelectItem>
                          <SelectItem value="inactive">Inactive Users</SelectItem>
                          <SelectItem value="new_users">New Signups</SelectItem>
                          <SelectItem value="streak">On Streak</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Select
                        value={newNotification.channel}
                        onValueChange={(v) => setNewNotification(p => ({ ...p, channel: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_app">In-App</SelectItem>
                          <SelectItem value="push">Push</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Schedule (optional)
                    </Label>
                    <Input
                      type="datetime-local"
                      value={newNotification.scheduled_for}
                      onChange={(e) => setNewNotification(p => ({ ...p, scheduled_for: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to save as draft and send manually.</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createMutation.mutate(newNotification)}
                    disabled={!newNotification.title || !newNotification.body || createMutation.isPending}
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {newNotification.scheduled_for ? "Schedule Notification" : "Create Notification"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list" className="gap-1"><Bell className="w-3.5 h-3.5" /> All</TabsTrigger>
              <TabsTrigger value="auto" className="gap-1"><Zap className="w-3.5 h-3.5" /> Auto</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications yet.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Bell className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium text-sm truncate">{n.title}</p>
                          {getStatusBadge(n.status)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{n.target_audience}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(n.created_at).toLocaleDateString()}</span>
                          {n.scheduled_for && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(n.scheduled_for).toLocaleString()}</span>}
                          {n.sent_at && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Sent</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {n.status !== "sent" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => sendMutation.mutate(n)} disabled={sendMutation.isPending}>
                            <Send className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMutation.mutate(n.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="auto" className="mt-4 space-y-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <SettingsIcon className="w-3.5 h-3.5" />
                Toggle automated triggers. Settings save instantly.
              </div>
              {ruleItems.map(item => (
                <div key={item.key} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={!!autoRules[item.key]}
                    onCheckedChange={(v) => updateRule(item.key, v as any)}
                  />
                </div>
              ))}

              <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Inactivity threshold</p>
                    <p className="text-xs text-muted-foreground">Hours before inactive nudge fires.</p>
                  </div>
                  <Input
                    type="number"
                    className="w-20"
                    value={autoRules.inactivityHours}
                    onChange={(e) => updateRule("inactivityHours", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Daily digest</p>
                    <p className="text-xs text-muted-foreground">Send a summary push every day.</p>
                  </div>
                  <Switch
                    checked={autoRules.digestEnabled}
                    onCheckedChange={(v) => updateRule("digestEnabled", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Digest hour</p>
                    <p className="text-xs text-muted-foreground">0–23 (24h clock)</p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    className="w-20"
                    value={autoRules.digestHour}
                    onChange={(e) => updateRule("digestHour", Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
