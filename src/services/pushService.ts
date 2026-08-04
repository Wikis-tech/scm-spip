// SCM Prospect Intelligence Platform - Enterprise Web Push Notification Client Service

/**
 * Helper to convert standard base64 URL VAPID public key to a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detects the active client runtime environment.
 * Evaluates whether we are running in an Android WebToNative app container,
 * a mobile browser, or a standard desktop browser.
 */
export function getRuntimeEnvironment(): 'desktop-browser' | 'mobile-browser' | 'android-app' {
  if (typeof window === 'undefined') return 'desktop-browser';
  
  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  
  // WebToNative often injects objects like window.WebToNative, window.webToNative, or custom webkit/OneSignal integrations
  const isWebToNative = 
    /webtonative/i.test(ua) || 
    (window as any).WebToNative !== undefined || 
    (window as any).webToNative !== undefined || 
    (window as any).OneSignalNative !== undefined;

  // General WebView indicators inside Android (e.g. "wv" or "Version/4.0")
  const isWebView = isAndroid && (/wv/i.test(ua) || /Version\/4.0/i.test(ua));

  if (isWebToNative || isWebView) {
    return 'android-app';
  }

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  if (isMobile) {
    return 'mobile-browser';
  }

  return 'desktop-browser';
}

/**
 * Determines if the current environment supports Service Workers and standard Push Notifications
 */
export function isPushSupported(): boolean {
  // If we are running inside the Android WebToNative application, we rely on Native OneSignal SDK,
  // so browser service worker push is not supported / bypasses this browser check.
  if (getRuntimeEnvironment() === 'android-app') {
    return false;
  }

  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Register the Service Worker and subscribe the user's browser for push notifications.
 * This runs seamlessly across Desktop and Android (Chrome, Edge, PWA installs, WebViews).
 */
export async function registerServiceWorkerAndSubscribe(
  userId: string,
  userEmail?: string,
  userRole?: string
): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[PUSH CLIENT] Service Worker or Push Notifications are not supported in this browser.');
    return false;
  }

  try {
    // 1. Register or get existing service worker registration
    console.log('[PUSH CLIENT] Registering Service Worker...');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[PUSH CLIENT] Service Worker registered successfully scope:', registration.scope);

    // 2. Wait until the service worker is active
    if (registration.installing) {
      console.log('[PUSH CLIENT] Service Worker is installing...');
    }
    
    // 3. Request native notifications permission if not already granted
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      if (currentPermission === 'default') {
        console.log('[PUSH CLIENT] Requesting browser notification permissions...');
        const result = await Notification.requestPermission();
        if (result !== 'granted') {
          console.warn('[PUSH CLIENT] Notification permission was denied by the user.');
          return false;
        }
      } else if (currentPermission === 'denied') {
        console.warn('[PUSH CLIENT] Browser notification permission is already denied. Please reset permissions in settings.');
        return false;
      }
    }

    // 4. Fetch the VAPID Public Key from our server
    console.log('[PUSH CLIENT] Retrieving VAPID public key from backend...');
    const keyResponse = await fetch('/api/push/public-key');
    if (!keyResponse.ok) {
      throw new Error(`Failed to fetch VAPID public key: ${keyResponse.statusText}`);
    }
    const { publicKey } = await keyResponse.json();
    if (!publicKey) {
      throw new Error('No public key returned from push server endpoint.');
    }

    // 5. Subscribe or locate existing subscription on the PushManager
    console.log('[PUSH CLIENT] Initiating/Retrieving subscription with PushManager...');
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('[PUSH CLIENT] Browser subscription registered successfully:', subscription.endpoint);

    // 6. Transmit the subscription metadata securely to the server database
    console.log('[PUSH CLIENT] Synchronizing subscription with SPIP server database...');
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-user-email': userEmail || '',
        'x-user-role': userRole || ''
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId
      })
    });

    if (!response.ok) {
      throw new Error(`Server failed to register subscription: ${response.statusText}`);
    }

    const resData = await response.json();
    console.log('[PUSH CLIENT SUCCESS] Browser push registration synchronized successfully with DB:', resData);
    
    // Persist subscription flag locally to bypass redundant runs
    localStorage.setItem('SCM_PUSH_SUBSCRIBED_ENDPOINT', subscription.endpoint);
    return true;
  } catch (err: any) {
    console.error('[PUSH CLIENT ERROR] Core subscription flow failed:', err.message || err);
    return false;
  }
}

/**
 * Cleanly unregisters the user's active push subscription
 */
export async function unsubscribeUser(
  userId?: string,
  userEmail?: string,
  userRole?: string
): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('[PUSH CLIENT] No active subscription found to unsubscribe.');
      return true;
    }

    // 1. Delete subscription from push server database
    console.log('[PUSH CLIENT] Notifying backend of unsubscribe request...');
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || '',
        'x-user-email': userEmail || '',
        'x-user-role': userRole || ''
      },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    // 2. Unsubscribe on the browser PushManager
    const unsubscribed = await subscription.unsubscribe();
    console.log('[PUSH CLIENT SUCCESS] Unsubscribed from browser PushManager:', unsubscribed);
    localStorage.removeItem('SCM_PUSH_SUBSCRIBED_ENDPOINT');
    return unsubscribed;
  } catch (err: any) {
    console.error('[PUSH CLIENT ERROR] Unsubscription flow failed:', err.message || err);
    return false;
  }
}
