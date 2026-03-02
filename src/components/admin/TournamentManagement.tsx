import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Trophy, Calendar, Users, Gamepad2, Target, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TOURNAMENT_TYPES = [
  { value: 'memory_match', label: 'Memory Match', icon: '🧠' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
  { value: 'keepyuppy', label: 'Keepy Uppy', icon: '⚽' },
  { value: 'spin_wheel', label: 'Spin Wheel', icon: '🎰' },
  { value: 'digital_task', label: 'Digital Task', icon: '💻' },
  { value: 'survey_blitz', label: 'Survey Blitz', icon: '📋' },
  { value: 'trivia', label: 'Trivia', icon: '❓' },
];

const DURATIONS = [
  { value: 'daily', label: 'Daily (24h)', hours: 24 },
  { value: 'weekly', label: 'Weekly (7 days)', hours: 168 },
  { value: 'monthly', label: 'Monthly (30 days)', hours: 720 },
];

interface TournamentForm {
  name: string;
  description: string;
  game_type: string;
  duration: string;
  prize_pool: number;
  entry_fee: number;
  max_participants: number;
}

const DEFAULT_FORM: TournamentForm = {
  name: '',
  description: '',
  game_type: 'memory_match',
  duration: 'daily',
  prize_pool: 500,
  entry_fee: 0,
  max_participants: 100,
};

export function TournamentManagement() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<TournamentForm>({ ...DEFAULT_FORM });

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (f: TournamentForm) => {
      const durationHours = DURATIONS.find(d => d.value === f.duration)?.hours || 24;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

      const { error } = await supabase.from('game_tournaments').insert({
        name: f.name,
        description: f.description,
        game_type: f.game_type,
        prize_pool: f.prize_pool,
        entry_fee: f.entry_fee,
        max_participants: f.max_participants,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'active',
        prize_distribution: { "1": 50, "2": 30, "3": 20 },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tournament created!');
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      setCreateOpen(false);
      setForm({ ...DEFAULT_FORM });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('game_tournaments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tournament deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateField = (field: keyof TournamentForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600';
      case 'scheduled': return 'bg-blue-500/10 text-blue-600';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeInfo = (type: string) => TOURNAMENT_TYPES.find(t => t.value === type);

  return (
    <div className="space-y-4">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Create Tournament
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Tournament</DialogTitle>
            <DialogDescription>Set up a new tournament for users to compete in.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 py-2 pr-4">
              <div className="space-y-2">
                <Label>Tournament Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Weekly Memory Master"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe the tournament..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.game_type} onValueChange={(v) => updateField('game_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TOURNAMENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={form.duration} onValueChange={(v) => updateField('duration', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Prize Pool</Label>
                  <Input
                    type="number"
                    value={form.prize_pool}
                    onChange={(e) => updateField('prize_pool', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entry Fee</Label>
                  <Input
                    type="number"
                    value={form.entry_fee}
                    onChange={(e) => updateField('entry_fee', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Players</Label>
                  <Input
                    type="number"
                    value={form.max_participants}
                    onChange={(e) => updateField('max_participants', parseInt(e.target.value) || 50)}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.name}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Tournament'}
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading tournaments...</p>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No tournaments yet. Create one above.</p>
          </CardContent>
        </Card>
      ) : (
        tournaments.map((t: any) => {
          const typeInfo = getTypeInfo(t.game_type);
          const endDate = new Date(t.end_time);
          const isActive = t.status === 'active' && endDate > new Date();
          return (
            <Card key={t.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg">{typeInfo?.icon || '🏆'}</span>
                      <p className="font-semibold truncate">{t.name}</p>
                      <Badge className={getStatusColor(isActive ? 'active' : t.status)}>
                        {isActive ? 'Active' : t.status}
                      </Badge>
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{t.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Trophy className="w-3 h-3" /> {t.prize_pool} pts
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" /> Max {t.max_participants}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" /> {endDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      if (confirm('Delete this tournament?')) deleteMutation.mutate(t.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
