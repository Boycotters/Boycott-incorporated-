import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

interface PushNotificationProviderProps {
  children: React.ReactNode;
}

export const PushNotificationProvider = ({ children }: PushNotificationProviderProps) => {
  const { user } = useAuth();
  const { registerPushNotifications, isSupported, isRegistered, error } = usePushNotifications();

  useEffect(() => {
    // Auto-register when user logs in on native platform
    if (user && isSupported && !isRegistered && !error) {
      registerPushNotifications();
    }
  }, [user, isSupported, isRegistered, error, registerPushNotifications]);

  return <>{children}</>;
};
