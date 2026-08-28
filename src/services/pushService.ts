import { supabase } from '../lib/supabase';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function getRuntimeEnvironment(): 'desktop-browser' | 'mobile-browser' | 'android-app' {
  if (typeof window === 'undefined') return 'desktop-browser';
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isNativeWrapper = /webtonative/i.test(ua) || (window as any).WebToNative || (window as any).webToNative || (window as any).OneSignalNative;
  const isWebView = isAndroid && (/wv/i.test(ua) || /Version\/4.0/i.test(ua));
  if (isNativeWrapper || isWebView) return 'android-app';
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile-browser' : 'desktop-browser';
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

async function token() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Authenticated SPIP session required.');
  return data.session.access_token;
}

async function api(path: string, init: RequestInit = {}) {
  const accessToken = await token();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

export async function registerServiceWorkerAndSubscribe(_userId?: string, _userEmail?: string, _userRole?: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const keyResponse = await fetch('/api/push/public-key');
    const keyBody = await keyResponse.json().catch(() => ({}));
    if (!keyResponse.ok || !keyBody.publicKey) throw new Error(keyBody.error || 'Push service is not configured.');

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyBody.publicKey),
      });
    }

    await api('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    localStorage.setItem('SCM_PUSH_SUBSCRIBED_ENDPOINT', subscription.endpoint);
    return true;
  } catch (error) {
    console.error('[SPIP PUSH] Registration failed:', error);
    return false;
  }
}

export async function unsubscribeUser(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;
    await api('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: subscription.endpoint }) });
    const ok = await subscription.unsubscribe();
    localStorage.removeItem('SCM_PUSH_SUBSCRIBED_ENDPOINT');
    return ok;
  } catch (error) {
    console.error('[SPIP PUSH] Unsubscribe failed:', error);
    return false;
  }
}

export async function getPushStatus() { return api('/api/push/status'); }
export async function sendTestPush() { return api('/api/push/test', { method: 'POST' }); }
export async function getNotificationPreferences() { return api('/api/notification-preferences'); }
export async function saveNotificationPreferences(values: Record<string, any>) {
  return api('/api/notification-preferences', { method: 'PATCH', body: JSON.stringify(values) });
}

export async function getReminders(limit = 50) {
  return api(`/api/reminders?limit=${Math.min(100, Math.max(1, limit))}`);
}

export async function createCustomReminder(values: {
  title: string;
  message?: string;
  scheduledFor: string;
  priority?: 'normal' | 'high' | 'critical';
  sourceType?: 'follow_up' | 'custom';
  sourceId?: string;
  prospectId?: string;
  prospectName?: string;
  url?: string;
}) {
  return api('/api/reminders/custom', { method: 'POST', body: JSON.stringify(values) });
}

export async function snoozeReminder(id: string, minutes = 10) {
  return api(`/api/reminders/${encodeURIComponent(id)}/snooze`, {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  });
}

export async function cancelReminder(id: string) {
  return api(`/api/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function dispatchOwnDueReminders() {
  return api('/api/reminders/dispatch-self', { method: 'POST' });
}

export async function syncServiceWorkerRegistration() {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try { await navigator.serviceWorker.register('/sw.js', { scope: '/' }); }
  catch { /* Settings exposes a retry path. */ }
}

let heartbeatStarted = false;
export function startForegroundReminderHeartbeat() {
  if (heartbeatStarted || typeof window === 'undefined') return;
  heartbeatStarted = true;

  const tick = async () => {
    if (document.visibilityState !== 'visible') return;
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return;
    try { await dispatchOwnDueReminders(); }
    catch { /* Background scheduler remains authoritative; this is only a safety net. */ }
  };

  window.setTimeout(tick, 5_000);
  window.setInterval(tick, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick();
  });
}
