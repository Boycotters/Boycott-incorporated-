import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PushNotificationProviderProps {
  children: React.ReactNode;
}

export const PushNotificationProvider = ({ children }: PushNotificationProviderProps) => {
  const { user } = useAuth();
  const { registerPushNotifications, isSupported, isRegistered, error } = usePushNotifications();

  useEffect(() => {
    if (user && isSupported && !isRegistered && !error) {
      registerPushNotifications();
    }
  }, [user, isSupported, isRegistered, error, registerPushNotifications]);

  // Realtime in-app toasts for queued notifications (transfers, upgrades, etc.)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-toasts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_queue',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n: any = payload.new;
          if (!n) return;
          toast(n.title || 'Notification', {
            description: n.body,
            duration: 6000,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return <>{children}</>;
};
