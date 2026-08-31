import { supabase } from '../lib/supabase';

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your SPIP session has expired. Please sign in again.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { ...(await authHeaders()), ...(init?.headers || {}) } });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) throw new Error(body?.error || `Microsoft 365 request failed (${response.status}).`);
  return body;
}

export type Microsoft365Status = {
  configured: boolean;
  connected: boolean;
  email?: string | null;
  displayName?: string | null;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
  capabilities?: { mailSend: boolean; calendarReadWrite: boolean };
};

export const microsoft365Service = {
  status: (): Promise<Microsoft365Status> => request('/api/microsoft/status'),
  async connect() {
    const result = await request('/api/microsoft/connect/start', { method: 'POST', body: '{}' });
    if (!result?.authorizationUrl) throw new Error('Microsoft authorization URL was not returned.');
    window.location.assign(result.authorizationUrl);
  },
  disconnect: () => request('/api/microsoft/connection', { method: 'DELETE' }),
  calendarEvents: (days = 30) => request(`/api/microsoft/calendar/events?days=${days}`),
  publishMeeting: (meetingId: string) => request('/api/microsoft/calendar/publish', { method: 'POST', body: JSON.stringify({ meetingId }) }),
  sendMail: (payload: { to: string; subject: string; body: string; prospectId?: string; prospectName?: string }) =>
    request('/api/microsoft/mail/send', { method: 'POST', body: JSON.stringify(payload) }),
};