import { useEffect, useState, useCallback } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  token: string | null;
  error: string | null;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    token: null,
    error: null,
  });

  const isNativePlatform = Capacitor.isNativePlatform();

  const saveTokenToDatabase = useCallback(async (token: string) => {
    if (!user) return;

    const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    
    try {
      // Upsert token (insert or update if exists)
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            token,
            platform,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,token',
          }
        );

      if (error) throw error;
      
      setState(prev => ({ ...prev, isRegistered: true, token }));
    } catch (error) {
      console.error('Error saving push token:', error);
      setState(prev => ({ ...prev, error: 'Failed to save push token' }));
    }
  }, [user]);

  const registerPushNotifications = useCallback(async () => {
    if (!isNativePlatform) {
      setState(prev => ({ ...prev, isSupported: false }));
      return;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        // Register with APNS/FCM
        await PushNotifications.register();
        setState(prev => ({ ...prev, isSupported: true }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isSupported: true,
          error: 'Push notification permission denied' 
        }));
        toast.error('Please enable notifications in your device settings');
      }
    } catch (error) {
      console.error('Error registering push notifications:', error);
      setState(prev => ({ ...prev, error: 'Failed to register for push notifications' }));
    }
  }, [isNativePlatform]);

  const unregisterPushNotifications = useCallback(async () => {
    if (!user || !state.token) return;

    try {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', state.token);

      setState(prev => ({ ...prev, isRegistered: false, token: null }));
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }, [user, state.token]);

  useEffect(() => {
    if (!isNativePlatform || !user) return;

    // Listen for registration success
    const registrationListener = PushNotifications.addListener(
      'registration',
      (token: Token) => {
        console.log('Push registration success, token:', token.value);
        saveTokenToDatabase(token.value);
      }
    );

    // Listen for registration errors
    const registrationErrorListener = PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error('Push registration error:', error);
        setState(prev => ({ ...prev, error: 'Registration failed' }));
      }
    );

    // Listen for incoming notifications when app is in foreground
    const notificationReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        toast(notification.title || 'New notification', {
          description: notification.body,
        });
      }
    );

    // Listen for notification actions (when user taps on notification)
    const notificationActionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        // Handle navigation based on notification data
        const data = action.notification.data;
        if (data?.route) {
          window.location.href = data.route;
        }
      }
    );

    // Register on mount
    registerPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      notificationReceivedListener.then(l => l.remove());
      notificationActionListener.then(l => l.remove());
    };
  }, [isNativePlatform, user, registerPushNotifications, saveTokenToDatabase]);

  return {
    ...state,
    registerPushNotifications,
    unregisterPushNotifications,
  };
};
