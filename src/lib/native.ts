/**
 * Native platform helpers built on Capacitor.
 * All helpers are safe to call from the web — they no-op or fall back gracefully
 * when the app is not running inside a native shell.
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Clipboard } from '@capacitor/clipboard';
import { Device } from '@capacitor/device';
import { Dialog } from '@capacitor/dialog';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Toast } from '@capacitor/toast';

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform();

/** Initialize native shell chrome, listeners, and notification permissions. */
export async function initNative() {
  if (!isNative()) return;

  try {
    await SplashScreen.hide();
  } catch {}

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#14b8a6' });
    }
  } catch {}

  try {
    await LocalNotifications.requestPermissions();
  } catch {}

  // Hardware back button → history back, exit on root
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });

  Keyboard.addListener('keyboardWillShow', () => {
    document.body.classList.add('keyboard-open');
  });
  Keyboard.addListener('keyboardWillHide', () => {
    document.body.classList.remove('keyboard-open');
  });
}

/* ---------------- Haptics ---------------- */
export const haptic = {
  light: () => isNative() && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  medium: () => isNative() && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
  heavy: () => isNative() && Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}),
  success: () => isNative() && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  warning: () => isNative() && Haptics.notification({ type: NotificationType.Warning }).catch(() => {}),
  error: () => isNative() && Haptics.notification({ type: NotificationType.Error }).catch(() => {}),
};

/* ---------------- Toast ---------------- */
export async function nativeToast(text: string, duration: 'short' | 'long' = 'short') {
  if (isNative()) {
    try { await Toast.show({ text, duration }); return; } catch {}
  }
}

/* ---------------- Camera ---------------- */
export async function takePhoto() {
  if (!isNative()) throw new Error('Camera only available on device');
  return Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
  });
}

/* ---------------- Geolocation ---------------- */
export async function currentPosition() {
  if (isNative()) {
    return Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
  }
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
}

/* ---------------- Share ---------------- */
export async function share(opts: { title?: string; text?: string; url?: string; dialogTitle?: string }) {
  if (isNative()) return Share.share(opts);
  if (navigator.share) return navigator.share(opts);
  await navigator.clipboard.writeText(opts.url || opts.text || '');
  return nativeToast('Copied to clipboard');
}

/* ---------------- Clipboard ---------------- */
export async function copy(text: string) {
  if (isNative()) return Clipboard.write({ string: text });
  return navigator.clipboard.writeText(text);
}

/* ---------------- Preferences (native KV) ---------------- */
export const prefs = {
  async get(key: string) {
    if (isNative()) return (await Preferences.get({ key })).value;
    return localStorage.getItem(key);
  },
  async set(key: string, value: string) {
    if (isNative()) return Preferences.set({ key, value });
    localStorage.setItem(key, value);
  },
  async remove(key: string) {
    if (isNative()) return Preferences.remove({ key });
    localStorage.removeItem(key);
  },
};

/* ---------------- Network ---------------- */
export const network = {
  status: () => (isNative() ? Network.getStatus() : Promise.resolve({ connected: navigator.onLine, connectionType: 'unknown' as const })),
  onChange: (cb: (connected: boolean) => void) => {
    if (isNative()) {
      const h = Network.addListener('networkStatusChange', (s) => cb(s.connected));
      return () => { h.then(x => x.remove()); };
    }
    const on = () => cb(true);
    const off = () => cb(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  },
};

/* ---------------- Device ---------------- */
export const device = {
  info: () => (isNative() ? Device.getInfo() : Promise.resolve({ platform: 'web' as const, model: navigator.userAgent })),
  id: () => (isNative() ? Device.getId() : Promise.resolve({ identifier: 'web' })),
};

/* ---------------- Local notifications ---------------- */
export async function notify(title: string, body: string, at?: Date) {
  if (!isNative()) {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
    return;
  }
  await LocalNotifications.schedule({
    notifications: [{
      id: Date.now() % 100000,
      title,
      body,
      schedule: at ? { at } : undefined,
    }],
  });
}

/* ---------------- In-app browser ---------------- */
export const openUrl = (url: string) =>
  isNative() ? Browser.open({ url }) : Promise.resolve(window.open(url, '_blank'));

/* ---------------- Native dialogs ---------------- */
export const dialog = {
  alert: (message: string, title = 'Notice') => (isNative() ? Dialog.alert({ title, message }) : Promise.resolve(window.alert(message))),
  confirm: async (message: string, title = 'Confirm') => {
    if (isNative()) return (await Dialog.confirm({ title, message })).value;
    return window.confirm(message);
  },
  prompt: async (message: string, title = 'Input') => {
    if (isNative()) return (await Dialog.prompt({ title, message })).value;
    return window.prompt(message) || '';
  },
};

/* ---------------- Filesystem ---------------- */
export const files = {
  write: (path: string, data: string) =>
    Filesystem.writeFile({ path, data, directory: Directory.Data, encoding: Encoding.UTF8 }),
  read: (path: string) =>
    Filesystem.readFile({ path, directory: Directory.Data, encoding: Encoding.UTF8 }),
  remove: (path: string) =>
    Filesystem.deleteFile({ path, directory: Directory.Data }),
};
