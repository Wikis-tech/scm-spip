import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';
import { syncServiceWorkerRegistration, startForegroundReminderHeartbeat } from './services/pushService';

const nativeFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  let parsed: URL | null = null;
  try { parsed = new URL(requestUrl, window.location.origin); } catch { parsed = null; }
  const isSpipApi = Boolean(parsed && parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/'));
  if (!isSpipApi) return nativeFetch(input, init);

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await nativeFetch(input, { ...init, headers });
  if (parsed?.pathname === '/api/auth/logout') await supabase.auth.signOut();
  return response;
};

syncServiceWorkerRegistration();
startForegroundReminderHeartbeat();

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
