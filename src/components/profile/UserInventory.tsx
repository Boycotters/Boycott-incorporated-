import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Package, Sparkles, Check } from "lucide-react";

interface InventoryItem {
  id: string;
  user_id: string;
  reward_id: string;
  item_type: string;
  is_equipped: boolean;
  equipped_at: string | null;
  created_at: string;
  rewards: {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    category: string | null;
  };
}

export function UserInventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['user-inventory', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          *,
          rewards (id, name, description, image, category)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!user?.id,
  });

  const equipMutation = useMutation({
    mutationFn: async ({ inventoryId, equip }: { inventoryId: string; equip: boolean }) => {
      const { data, error } = await supabase.rpc('equip_inventory_item', {
        p_user_id: user?.id,
        p_inventory_id: inventoryId,
        p_equip: equip
      });
      
      if (error) throw error;
      return data as { success: boolean; message: string; item_name?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        queryClient.invalidateQueries({ queryKey: ['equipped-items'] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'avatar_frame': return '🖼️ Frame';
      case 'badge': return '🏅 Badge';
      case 'theme': return '🎨 Theme';
      default: return '✨ Item';
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'avatar_frame': return 'bg-purple-500/10 text-purple-600';
      case 'badge': return 'bg-yellow-500/10 text-yellow-600';
      case 'theme': return 'bg-blue-500/10 text-blue-600';
      default: return 'bg-primary/10 text-primary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!inventory || inventory.length === 0) {
    return (
      <Card className="bg-gradient-card p-6 rounded-xl shadow-card border border-border text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No items in your inventory</p>
        <p className="text-xs text-muted-foreground mt-1">
          Redeem digital items from the marketplace to see them here!
        </p>
      </Card>
    );
  }

  // Group items by type
  const groupedItems = inventory.reduce((acc, item) => {
    const type = item.item_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([type, items]) => (
        <div key={type} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {getItemTypeLabel(type)} ({items.length})
          </h4>
          <div className="grid gap-2">
            {items.map(item => (
              <Card 
                key={item.id} 
                className={`p-3 rounded-xl transition-all ${
                  item.is_equipped 
                    ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' 
                    : 'bg-gradient-card border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.rewards.image ? (
                    <img 
                      src={item.rewards.image} 
                      alt={item.rewards.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getItemTypeColor(item.item_type)}`}>
                      <Sparkles className="w-6 h-6" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{item.rewards.name}</p>
                      {item.is_equipped && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/20 text-primary">
                          <Check className="w-2.5 h-2.5 mr-0.5" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.rewards.description || 'Digital collectible'}
                    </p>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={item.is_equipped ? "outline" : "default"}
                    className="h-8 text-xs"
                    onClick={() => equipMutation.mutate({ 
                      inventoryId: item.id, 
                      equip: !item.is_equipped 
                    })}
                    disabled={equipMutation.isPending}
                  >
                    {item.is_equipped ? 'Remove' : 'Equip'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}