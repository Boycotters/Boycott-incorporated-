import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Gift, Coins, Edit2, Trash2, Package, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  stock: number;
  category: string | null;
  image: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

const ZAMBIAN_CATEGORIES = [
  { value: "airtime", label: "Airtime & Data" },
  { value: "electricity", label: "ZESCO Units" },
  { value: "groceries", label: "Grocery Vouchers" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "data_bundles", label: "Data Bundles" },
  { value: "vouchers", label: "Shopping Vouchers" },
  { value: "digital", label: "Digital Items" },
  { value: "other", label: "Other" },
];

const PRESET_REWARDS = [
  { name: "MTN Airtime K10", description: "K10 MTN Zambia airtime top-up", points_cost: 100, category: "airtime", stock: 50 },
  { name: "Airtel Airtime K10", description: "K10 Airtel Zambia airtime", points_cost: 100, category: "airtime", stock: 50 },
  { name: "Zamtel Airtime K10", description: "K10 Zamtel airtime top-up", points_cost: 100, category: "airtime", stock: 50 },
  { name: "MTN 1GB Data", description: "1GB MTN data bundle (7 days)", points_cost: 120, category: "data_bundles", stock: 30 },
  { name: "Airtel 1.5GB Data", description: "1.5GB Airtel data bundle (30 days)", points_cost: 150, category: "data_bundles", stock: 30 },
  { name: "ZESCO 50 Units", description: "50 units of ZESCO electricity prepaid", points_cost: 200, category: "electricity", stock: 20 },
  { name: "ZESCO 100 Units", description: "100 units of ZESCO electricity prepaid", points_cost: 400, category: "electricity", stock: 15 },
  { name: "Shoprite K50 Voucher", description: "K50 Shoprite shopping voucher", points_cost: 500, category: "groceries", stock: 10 },
  { name: "Pick n Pay K50 Voucher", description: "K50 Pick n Pay shopping voucher", points_cost: 500, category: "groceries", stock: 10 },
  { name: "Game Stores K100 Voucher", description: "K100 Game Stores voucher", points_cost: 1000, category: "vouchers", stock: 5 },
  { name: "MTN 5GB Data", description: "5GB MTN monthly data bundle", points_cost: 350, category: "data_bundles", stock: 15 },
  { name: "Ulendo Bus Ticket", description: "Single inter-city bus ticket", points_cost: 300, category: "transport", stock: 10 },
  { name: "DStv Day Pass", description: "24-hour DStv Access subscription", points_cost: 80, category: "entertainment", stock: 25 },
  { name: "Showmax Mobile (1 Month)", description: "1 month Showmax Mobile subscription", points_cost: 250, category: "entertainment", stock: 10 },
  { name: "MTN Airtime K25", description: "K25 MTN airtime top-up", points_cost: 250, category: "airtime", stock: 30 },
  { name: "Airtel Airtime K50", description: "K50 Airtel airtime top-up", points_cost: 500, category: "airtime", stock: 20 },
];

export function RewardsManagement() {
  const queryClient = useQueryClient();
  const [addRewardOpen, setAddRewardOpen] = useState(false);
  const [editReward, setEditReward] = useState<Reward | null>(null);
  const [newReward, setNewReward] = useState({
    name: "",
    description: "",
    points_cost: 100,
    stock: 50,
    category: "airtime",
    image: "",
  });

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["admin-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .order("points_cost", { ascending: true });
      if (error) throw error;
      return data as Reward[];
    },
  });

  const addRewardMutation = useMutation({
    mutationFn: async (reward: typeof newReward) => {
      const { error } = await supabase.from("rewards").insert({
        name: reward.name,
        description: reward.description || null,
        points_cost: reward.points_cost,
        stock: reward.stock,
        category: reward.category,
        image: reward.image || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward added!");
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
      setAddRewardOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addPresetsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rewards").insert(
        PRESET_REWARDS.map((r) => ({
          ...r,
          is_active: true,
          image: null,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Added ${PRESET_REWARDS.length} Zambian rewards!`);
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateRewardMutation = useMutation({
    mutationFn: async (reward: Reward) => {
      const { error } = await supabase
        .from("rewards")
        .update({
          name: reward.name,
          description: reward.description,
          points_cost: reward.points_cost,
          stock: reward.stock,
          category: reward.category,
          image: reward.image,
          is_active: reward.is_active,
        })
        .eq("id", reward.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
      setEditReward(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rewards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleRewardMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("rewards")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setNewReward({ name: "", description: "", points_cost: 100, stock: 50, category: "airtime", image: "" });
  };

  const getCategoryLabel = (cat: string | null) => {
    return ZAMBIAN_CATEGORIES.find((c) => c.value === cat)?.label || cat || "Other";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Redeemable Rewards
              </CardTitle>
              <CardDescription>Manage marketplace items users can redeem with points</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addPresetsMutation.mutate()} disabled={addPresetsMutation.isPending}>
                {addPresetsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Package className="w-4 h-4 mr-1" />}
                Add Zambian Presets
              </Button>
              <Button size="sm" onClick={() => setAddRewardOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Reward
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Gift className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No rewards yet. Add presets or create custom ones.</p>
              <Button onClick={() => addPresetsMutation.mutate()} disabled={addPresetsMutation.isPending}>
                <Package className="w-4 h-4 mr-2" />
                Add Zambian Presets
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Gift className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium truncate">{reward.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{getCategoryLabel(reward.category)}</Badge>
                        <Badge className={reward.is_active ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}>
                          {reward.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    {reward.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{reward.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {reward.points_cost} pts
                        </span>
                        <span>Stock: {reward.stock}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={reward.is_active ?? false}
                          onCheckedChange={(checked) => toggleRewardMutation.mutate({ id: reward.id, isActive: checked })}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditReward(reward)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (confirm("Delete this reward?")) deleteRewardMutation.mutate(reward.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Reward Dialog */}
      <Dialog open={addRewardOpen} onOpenChange={setAddRewardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Reward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newReward.name} onChange={(e) => setNewReward((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., MTN Airtime K10" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newReward.description} onChange={(e) => setNewReward((p) => ({ ...p, description: e.target.value }))} placeholder="Brief description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Points Cost</Label>
                <Input type="number" min={1} value={newReward.points_cost} onChange={(e) => setNewReward((p) => ({ ...p, points_cost: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" min={0} value={newReward.stock} onChange={(e) => setNewReward((p) => ({ ...p, stock: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newReward.category} onValueChange={(v) => setNewReward((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZAMBIAN_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input value={newReward.image} onChange={(e) => setNewReward((p) => ({ ...p, image: e.target.value }))} placeholder="https://..." />
            </div>
            <Button className="w-full" onClick={() => addRewardMutation.mutate(newReward)} disabled={addRewardMutation.isPending || !newReward.name}>
              {addRewardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Reward
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Reward Dialog */}
      <Dialog open={!!editReward} onOpenChange={(open) => !open && setEditReward(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Reward</DialogTitle>
          </DialogHeader>
          {editReward && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editReward.name} onChange={(e) => setEditReward((p) => p ? { ...p, name: e.target.value } : null)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editReward.description || ""} onChange={(e) => setEditReward((p) => p ? { ...p, description: e.target.value } : null)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Points Cost</Label>
                  <Input type="number" min={1} value={editReward.points_cost} onChange={(e) => setEditReward((p) => p ? { ...p, points_cost: parseInt(e.target.value) || 0 } : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input type="number" min={0} value={editReward.stock} onChange={(e) => setEditReward((p) => p ? { ...p, stock: parseInt(e.target.value) || 0 } : null)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editReward.category || "other"} onValueChange={(v) => setEditReward((p) => p ? { ...p, category: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZAMBIAN_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => editReward && updateRewardMutation.mutate(editReward)} disabled={updateRewardMutation.isPending}>
                {updateRewardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
