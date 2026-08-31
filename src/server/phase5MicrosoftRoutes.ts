import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const SCOPES = ['openid','profile','email','offline_access','User.Read','Mail.Send','Calendars.ReadWrite'];

function env(name: string) { return String(process.env[name] || '').trim(); }
function userOf(req: Request): any { return (req as any).user || null; }
function clean(value: unknown, max = 2000) { return String(value ?? '').trim().slice(0, max); }
function baseUrl() { return env('SPIP_PUBLIC_URL') || env('VERCEL_PROJECT_PRODUCTION_URL') || 'https://scm-spip.vercel.app'; }
function callbackUrl() { return env('MICROSOFT_REDIRECT_URI') || `${baseUrl().replace(/\/$/,'')}/api/microsoft/callback`; }
function isConfigured() { return Boolean(env('MICROSOFT_TENANT_ID') && env('MICROSOFT_CLIENT_ID') && env('MICROSOFT_CLIENT_SECRET') && env('MICROSOFT_TOKEN_ENCRYPTION_KEY')); }
function tenantBase() { return `https://login.microsoftonline.com/${encodeURIComponent(env('MICROSOFT_TENANT_ID'))}/oauth2/v2.0`; }

function encryptionKey() {
  const secret = env('MICROSOFT_TOKEN_ENCRYPTION_KEY');
  if (!secret) throw new Error('Microsoft token encryption key is not configured.');
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), body.toString('base64url')].join('.');
}

function decrypt(value: string | null | undefined) {
  if (!value) return '';
  const [ivText, tagText, bodyText] = value.split('.');
  if (!ivText || !tagText || !bodyText) throw new Error('Stored Microsoft credential is invalid.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(bodyText, 'base64url')), decipher.final()]).toString('utf8');
}

function pkceChallenge(verifier: string) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

async function tokenRequest(params: Record<string,string>) {
  const response = await fetch(`${tenantBase()}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(clean(body?.error_description || body?.error || `Microsoft token exchange failed (${response.status}).`, 500));
  return body;
}

async function graph(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(clean(body?.error?.message || `Microsoft Graph request failed (${response.status}).`, 500));
  return body;
}

async function connectionFor(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from('microsoft_connections').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function accessTokenFor(supabase: SupabaseClient, userId: string) {
  const connection = await connectionFor(supabase, userId);
  if (!connection) throw new Error('Microsoft 365 is not connected.');

  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (connection.access_token_ciphertext && expiresAt > Date.now() + 120000) {
    return { accessToken: decrypt(connection.access_token_ciphertext), connection };
  }

  const refreshToken = decrypt(connection.refresh_token_ciphertext);
  if (!refreshToken) throw new Error('Microsoft 365 connection needs to be re-authorized.');

  try {
    const token = await tokenRequest({
      client_id: env('MICROSOFT_CLIENT_ID'),
      client_secret: env('MICROSOFT_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: SCOPES.join(' '),
    });
    const accessToken = String(token.access_token || '');
    const nextRefresh = String(token.refresh_token || refreshToken);
    const expires = new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString();
    await supabase.from('microsoft_connections').update({
      access_token_ciphertext: encrypt(accessToken),
      refresh_token_ciphertext: encrypt(nextRefresh),
      token_expires_at: expires,
      scopes: String(token.scope || '').split(/\s+/).filter(Boolean),
      updated_at: new Date().toISOString(),
      last_error: null,
    }).eq('user_id', userId);
    return { accessToken, connection: { ...connection, token_expires_at: expires } };
  } catch (error: any) {
    await supabase.from('microsoft_connections').update({ last_error: clean(error?.message, 500), updated_at: new Date().toISOString() }).eq('user_id', userId);
    throw error;
  }
}

function parseDateTime(date: string, time: string) {
  const normalized = /^\d{2}:\d{2}$/.test(time)
    ? time
    : (() => {
        const m = String(time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!m) return '09:00';
        let h = Number(m[1]);
        const minute = m[2];
        const ap = m[3].toUpperCase();
        if (ap === 'PM' && h !== 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2,'0')}:${minute}`;
      })();
  return `${date}T${normalized}:00`;
}

export function registerMicrosoft365PublicRoutes(app: Express, supabase: SupabaseClient) {
  app.get('/api/microsoft/callback', async (req: Request, res: Response) => {
    const state = clean(req.query.state, 300);
    const code = clean(req.query.code, 4000);
    const authError = clean(req.query.error_description || req.query.error, 500);
    const destination = `${baseUrl().replace(/\/$/,'')}/settings`;
    if (authError) return res.redirect(`${destination}?microsoft=error&message=${encodeURIComponent(authError)}`);
    if (!state || !code || !isConfigured()) return res.redirect(`${destination}?microsoft=error&message=${encodeURIComponent('Microsoft authorization could not be completed.')}`);

    try {
      const { data: row, error } = await supabase.from('microsoft_oauth_states').select('*').eq('state', state).maybeSingle();
      if (error || !row || row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) throw new Error('Microsoft authorization request expired. Start the connection again.');

      const token = await tokenRequest({
        client_id: env('MICROSOFT_CLIENT_ID'),
        client_secret: env('MICROSOFT_CLIENT_SECRET'),
        grant_type: 'authorization_code',
        code,
        redirect_uri: row.redirect_uri,
        code_verifier: decrypt(row.code_verifier_ciphertext),
        scope: SCOPES.join(' '),
      });
      const accessToken = String(token.access_token || '');
      const refreshToken = String(token.refresh_token || '');
      if (!accessToken || !refreshToken) throw new Error('Microsoft did not return the required delegated credentials.');

      const me = await graph(accessToken, '/me?$select=id,displayName,mail,userPrincipalName');
      const microsoftEmail = String(me?.mail || me?.userPrincipalName || '').toLowerCase();
      const { data: profile } = await supabase.from('profiles').select('email,status').eq('id', row.user_id).maybeSingle();
      if (!profile || profile.status !== 'ACTIVE') throw new Error('The SPIP account is no longer active.');
      if (!microsoftEmail.endsWith('@scmcapitalng.com')) throw new Error('Connect your SCM Capital Microsoft 365 account, not a personal Microsoft account.');
      if (String(profile.email || '').toLowerCase() !== microsoftEmail) throw new Error('The Microsoft 365 mailbox must match your SPIP corporate email.');

      const expires = new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString();
      const { error: saveError } = await supabase.from('microsoft_connections').upsert({
        user_id: row.user_id,
        microsoft_user_id: me.id,
        tenant_id: env('MICROSOFT_TENANT_ID'),
        email: microsoftEmail,
        display_name: me.displayName || null,
        scopes: String(token.scope || '').split(/\s+/).filter(Boolean),
        access_token_ciphertext: encrypt(accessToken),
        refresh_token_ciphertext: encrypt(refreshToken),
        token_expires_at: expires,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
      }, { onConflict: 'user_id' });
      if (saveError) throw saveError;
      await supabase.from('microsoft_oauth_states').update({ consumed_at: new Date().toISOString() }).eq('state', state);
      return res.redirect(`${destination}?microsoft=connected`);
    } catch (error: any) {
      return res.redirect(`${destination}?microsoft=error&message=${encodeURIComponent(clean(error?.message || 'Microsoft connection failed.', 500))}`);
    }
  });
}

export function registerMicrosoft365Routes(app: Express, supabase: SupabaseClient) {
  app.get('/api/microsoft/status', async (req, res) => {
    const user = userOf(req);
    if (!user?.userId) return res.status(401).json({ error: 'Authentication required.' });
    try {
      const connection = await connectionFor(supabase, user.userId);
      return res.json({
        configured: isConfigured(),
        connected: Boolean(connection),
        email: connection?.email || null,
        displayName: connection?.display_name || null,
        connectedAt: connection?.connected_at || null,
        lastSyncAt: connection?.last_sync_at || null,
        lastError: connection?.last_error || null,
        capabilities: { mailSend: true, calendarReadWrite: true },
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Unable to load Microsoft 365 connection status.' });
    }
  });

  app.post('/api/microsoft/connect/start', async (req, res) => {
    const user = userOf(req);
    if (!user?.userId) return res.status(401).json({ error: 'Authentication required.' });
    if (!isConfigured()) return res.status(503).json({ error: 'Microsoft 365 integration is not configured by the SPIP administrator.' });
    try {
      const state = crypto.randomBytes(32).toString('base64url');
      const verifier = crypto.randomBytes(64).toString('base64url');
      const redirectUri = callbackUrl();
      await supabase.from('microsoft_oauth_states').delete().eq('user_id', user.userId).lt('expires_at', new Date().toISOString());
      const { error } = await supabase.from('microsoft_oauth_states').insert({
        state,
        user_id: user.userId,
        code_verifier_ciphertext: encrypt(verifier),
        redirect_uri: redirectUri,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      const url = new URL(`${tenantBase()}/authorize`);
      url.searchParams.set('client_id', env('MICROSOFT_CLIENT_ID'));
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_mode', 'query');
      url.searchParams.set('scope', SCOPES.join(' '));
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', pkceChallenge(verifier));
      url.searchParams.set('code_challenge_method', 'S256');
      url.searchParams.set('prompt', 'select_account');
      return res.json({ authorizationUrl: url.toString() });
    } catch (error: any) {
      return res.status(500).json({ error: clean(error?.message || 'Unable to start Microsoft 365 authorization.', 500) });
    }
  });

  app.delete('/api/microsoft/connection', async (req, res) => {
    const user = userOf(req);
    if (!user?.userId) return res.status(401).json({ error: 'Authentication required.' });
    await supabase.from('microsoft_oauth_states').delete().eq('user_id', user.userId);
    const { error } = await supabase.from('microsoft_connections').delete().eq('user_id', user.userId);
    if (error) return res.status(500).json({ error: 'Unable to disconnect Microsoft 365.' });
    return res.json({ ok: true });
  });

  app.get('/api/microsoft/calendar/events', async (req, res) => {
    const user = userOf(req);
    if (!user?.userId) return res.status(401).json({ error: 'Authentication required.' });
    try {
      const { accessToken } = await accessTokenFor(supabase, user.userId);
      const start = new Date();
      const end = new Date(Date.now() + Math.min(60, Math.max(1, Number(req.query.days || 30))) * 86400000);
      const path = `/me/calendarView?startDateTime=${encodeURIComponent(start.toISOString())}&endDateTime=${encodeURIComponent(end.toISOString())}&$top=100&$orderby=start/dateTime&$select=id,subject,start,end,location,organizer,attendees,isOnlineMeeting,onlineMeeting,webLink,bodyPreview`;
      const result = await graph(accessToken, path, { headers: { Prefer: 'outlook.timezone="Africa/Lagos"' } });
      await supabase.from('microsoft_connections').update({ last_sync_at: new Date().toISOString(), last_error: null }).eq('user_id', user.userId);
      return res.json({ events: result?.value || [] });
    } catch (error: any) {
      return res.status(502).json({ error: clean(error?.message || 'Unable to read Outlook calendar.', 500) });
    }
  });

  app.post('/api/microsoft/calendar/publish', async (req, res) => {
    const user = userOf(req);
    const meetingId = clean(req.body?.meetingId, 200);
    if (!user?.userId) return res.status(401).json({ error: 'Authentication required.' });
    if (!meetingId) return res.status(400).json({ error: 'Meeting id is required.' });
    try {
      const { data: meeting } = await supabase.from('meetings').select('*').eq('id', meetingId).maybeSingle();
      if (!meeting) return res.status(404).json({ error: 'SPIP meeting not found.' });
      if (!user.isAdmin && String(meeting.officer_id) !== String(user.userId)) return res.status(403).json({ error: 'You do not own this meeting.' });

      const { accessToken } = await accessTokenFor(supabase, user.userId);
      const start = parseDateTime(meeting.date, meeting.time || '09:00');
      const startDate = new Date(`${start}+01:00`);
      const endDate = new Date(startDate.getTime() + Number(meeting.duration_minutes || 45) * 60000);
      const event = await graph(accessToken, '/me/events', {
        method: 'POST',
        body: JSON.stringify({
          subject: `SCM SPIP: ${meeting.purpose || meeting.prospect_name || 'Client Meeting'}`,
          body: { contentType: 'HTML', content: `<p>${clean(meeting.purpose || 'SCM client meeting', 1000)}</p><p>Relationship: ${clean(meeting.prospect_name || 'SCM Capital', 300)}</p><p>Created from SCM Prospect Intelligence Platform.</p>` },
          start: { dateTime: start.slice(0,16), timeZone: 'Africa/Lagos' },
          end: { dateTime: endDate.toLocaleString('sv-SE', { timeZone: 'Africa/Lagos' }).replace(' ','T').slice(0,16), timeZone: 'Africa/Lagos' },
          isReminderOn: true,
          reminderMinutesBeforeStart: 15,
          categories: ['SCM SPIP'],
        }),
      });
      await supabase.from('microsoft_event_links').upsert({
        user_id: user.userId,
        meeting_id: meetingId,
        graph_event_id: event.id,
        graph_change_key: event.changeKey || null,
        web_link: event.webLink || null,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,graph_event_id' });
      return res.status(201).json({ ok: true, eventId: event.id, webLink: event.webLink || null });
    } catch (error: any) {
      return res.status(502).json({ error: clean(error?.message || 'Unable to add this meeting to Outlook.', 500) });
    }
  });

  app.post('/api/microsoft/mail/send', async (req, res) => {
    const user = userOf(req);
    if (!user?.userId) return res.status(401).json({ error: 'Authentication required.' });
    const to = clean(req.body?.to, 320).toLowerCase();
    const subject = clean(req.body?.subject, 300);
    const body = clean(req.body?.body, 20000);
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ error: 'A valid recipient email is required.' });
    if (!subject || !body) return res.status(400).json({ error: 'Email subject and body are required.' });
    try {
      const { accessToken } = await accessTokenFor(supabase, user.userId);
      await graph(accessToken, '/me/sendMail', {
        method: 'POST',
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: 'HTML', content: body.replace(/\n/g, '<br>') },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: true,
        }),
      });
      if (req.body?.prospectId) {
        await supabase.from('activities').insert({
          id: `activity-${crypto.randomUUID()}`,
          prospect_id: clean(req.body.prospectId, 200),
          prospect_name: clean(req.body.prospectName, 300) || null,
          date: new Date().toISOString().slice(0,10),
          time: new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false }),
          officer_id: user.userId,
          officer_name: user.fullName || user.email?.split('@')[0],
          activity_type: 'Email',
          outcome: 'Sent via Microsoft 365',
          notes: `To: ${to}\nSubject: ${subject}`,
          status: 'Completed',
          created_at: new Date().toISOString(),
        });
      }
      return res.status(202).json({ ok: true });
    } catch (error: any) {
      return res.status(502).json({ error: clean(error?.message || 'Unable to send email through Microsoft 365.', 500) });
    }
  });
}