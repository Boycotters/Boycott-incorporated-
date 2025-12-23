import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.17f8b95e0aff4801afa816dd9a22fb4f',
  appName: 'ZamPoints',
  webDir: 'dist',
  server: {
    url: 'https://17f8b95e-0aff-4801-afa8-16dd9a22fb4f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
