import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import crypto from 'node:crypto';
import {
  authenticatePhase6,
  deleteUserConversation,
  getUserConversation,
  listUserConversations,
  providerStatus,
  runPhase6Assistant,
} from '../src/server/phase6AiRuntime.js';
import { ingestDocument } from '../src/server/phase6ArtifactRuntime.js';
import { generateArtifactV2 } from '../src/server/phase6ArtifactRuntimeV2.js';

const require = createRequire(import.meta.url);
const serverModule = require('../dist/server.cjs');
const app = serverModule.default || serverModule;

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseServerKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim() || '';
const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseServerKey || 'missing-server-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim() || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim() || '';
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:it@scmcapitalng.com',
    vapidPublic,
    vapidPrivate,
  );
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

async function getActiveProfile(req: any) {
  const authorization = String(req.headers?.authorization || '');
  if (!authorization.startsWith('Bearer ')) return null;
  if (!supabaseUrl || !supabaseServerKey) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const authUser = authData?.user;
  if (authError || !authUser?.id || !authUser.email) return null;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, permission_level, department, status, avatar_url')
    .eq('id', authUser.id)
    .maybeSingle();
  if (profileError || !profile || profile.status !== 'ACTIVE') return null;
  return { profile, authUser };
}

async function ensureLegacyUserDirectoryEntry(req: any) {
  try {
    const identity = await getActiveProfile(req);
    if (!identity) return;
    const { profile, authUser } = identity;
    const legacyRole = profile.permission_level === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : profile.permission_level === 'HOD_ADMIN'
        ? 'Admin'
        : 'Business Development Officer';

    const { error: syncError } = await supabase.from('users').upsert({
      id: profile.id,
      full_name: profile.full_name || authUser.email.split('@')[0],
      email: String(profile.email || authUser.email).toLowerCase(),
      role: legacyRole,
      department: profile.department || 'Asset Management',
      avatar_url: profile.avatar_url || null,
      status: 'Active',
    }, { onConflict: 'id' });

    if (syncError) {
      console.error('[SPIP USER SYNC] Unable to synchronize authenticated profile into legacy user directory:', syncError.message || syncError);
    }
  } catch (error: any) {
    console.error('[SPIP USER SYNC] Compatibility synchronization failed:', error?.message || error);
  }
}

async function sendPushToUser(userId: string, reminder: any) {
  if (!vapidPublic || !vapidPrivate) return { delivered: 0, failed: 0, reason: 'VAPID_NOT_CONFIGURED' };
  const { data: subscriptions, error } = await supabase
    .from('spip_push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  if (!subscriptions?.length) return { delivered: 0, failed: 0, reason: 'NO_ACTIVE_DEVICE' };

  const payload = JSON.stringify({
    id: reminder.id,
    title: reminder.title,
    message: reminder.message,
    priority: reminder.priority || 'normal',
    type: reminder.source_type || 'reminder',
    reminderKind: reminder.reminder_kind || 'reminder',
    url: reminder.metadata?.url || '/calendar',
    requireInteraction: reminder.priority === 'critical' || Boolean(reminder.metadata?.requireInteraction),
    timestamp: Date.now(),
  });

  let delivered = 0;
  let failed = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
        { TTL: 43_200, urgency: reminder.priority === 'critical' ? 'high' : 'normal' },
      );
      delivered += 1;
      await supabase.from('spip_push_subscriptions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', subscription.id);
    } catch (error: any) {
      failed += 1;
      const status = Number(error?.statusCode || 0);
      if (status === 404 || status === 410) {
        await supabase.from('spip_push_subscriptions').update({ is_active: false }).eq('id', subscription.id);
      }
    }
  }
  return { delivered, failed, reason: delivered ? null : 'DELIVERY_FAILED' };
}

async function dispatchDueReminders() {
  const now = new Date().toISOString();
  const { data: reminders, error } = await supabase
    .from('spip_reminders')
    .select('*')
    .eq('status', 'PENDING')
    .lte('scheduled_for', now)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order('scheduled_for', { ascending: true })
    .limit(100);
  if (error) throw error;

  const result = { scanned: reminders?.length || 0, sent: 0, deferred: 0, failed: 0 };
  for (const reminder of reminders || []) {
    if (reminder.expires_at && new Date(reminder.expires_at).getTime() < Date.now()) {
      await supabase.from('spip_reminders').update({ status: 'FAILED', last_error: 'REMINDER_EXPIRED', next_attempt_at: null, updated_at: now }).eq('id', reminder.id);
      result.failed += 1;
      continue;
    }

    try {
      const delivery = await sendPushToUser(reminder.user_id, reminder);
      if (delivery.delivered > 0) {
        await supabase.from('spip_reminders').update({
          status: 'SENT', sent_at: now, next_attempt_at: null,
          attempt_count: Number(reminder.attempt_count || 0) + 1,
          last_error: null, updated_at: now,
        }).eq('id', reminder.id).eq('status', 'PENDING');
        await supabase.from('spip_notification_events').insert({
          user_id: reminder.user_id,
          reminder_id: reminder.id,
          title: reminder.title,
          message: reminder.message,
          category: reminder.source_type || 'reminder',
          priority: reminder.priority || 'normal',
        });
        result.sent += 1;
      } else {
        const attempts = Number(reminder.attempt_count || 0) + 1;
        const delayMinutes = Math.min(60, Math.max(5, 2 ** Math.min(attempts, 5)));
        await supabase.from('spip_reminders').update({
          attempt_count: attempts,
          last_error: delivery.reason,
          next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
          updated_at: now,
        }).eq('id', reminder.id).eq('status', 'PENDING');
        result.deferred += 1;
      }
    } catch (error: any) {
      const attempts = Number(reminder.attempt_count || 0) + 1;
      await supabase.from('spip_reminders').update({
        attempt_count: attempts,
        last_error: String(error?.message || 'DISPATCH_ERROR').slice(0, 300),
        next_attempt_at: new Date(Date.now() + Math.min(60, attempts * 10) * 60_000).toISOString(),
        updated_at: now,
      }).eq('id', reminder.id).eq('status', 'PENDING');
      result.failed += 1;
    }
  }
  return result;
}

async function handleNotificationHotfix(req: any, res: any, path: string) {
  if (path === 'push/public-key' && req.method === 'GET') {
    res.status(vapidPublic ? 200 : 503).json(vapidPublic ? { publicKey: vapidPublic } : { error: 'Push notifications are not configured in the production environment.' });
    return true;
  }

  if (path === 'reminders/dispatch' && req.method === 'POST') {
    const configured = process.env.REMINDER_CRON_SECRET || '';
    const supplied = String(req.headers['x-spip-reminder-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '') || '');
    if (!configured || !supplied || !safeEqual(configured, supplied)) {
      res.status(401).json({ error: 'Reminder dispatcher authorization failed.' });
      return true;
    }
    try {
      res.json({ ok: true, ...(await dispatchDueReminders()) });
    } catch (error: any) {
      res.status(500).json({ error: 'Reminder dispatch failed.', detail: String(error?.message || error).slice(0, 300) });
    }
    return true;
  }

  if (!path.startsWith('push/')) return false;
  const identity = await getActiveProfile(req);
  if (!identity) {
    res.status(401).json({ error: 'Authentication required.' });
    return true;
  }
  const userId = identity.profile.id;

  if (path === 'push/subscribe' && req.method === 'POST') {
    const subscription = req.body?.subscription;
    const endpoint = String(subscription?.endpoint || '').trim();
    const p256dh = String(subscription?.keys?.p256dh || '').trim();
    const auth = String(subscription?.keys?.auth || '').trim();
    if (!endpoint || !p256dh || !auth) {
      res.status(400).json({ error: 'Invalid push subscription.' });
      return true;
    }
    const { error } = await supabase.from('spip_push_subscriptions').upsert({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    if (error) res.status(500).json({ error: 'Unable to register this device.', detail: error.message });
    else res.status(201).json({ ok: true });
    return true;
  }

  if (path === 'push/unsubscribe' && req.method === 'POST') {
    const endpoint = String(req.body?.endpoint || '').trim();
    await supabase.from('spip_push_subscriptions')
      .update({ is_active: false, last_seen_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    res.json({ ok: true });
    return true;
  }

  if (path === 'push/status' && req.method === 'GET') {
    const { count } = await supabase.from('spip_push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);
    res.json({ configured: Boolean(vapidPublic && vapidPrivate), activeDevices: count || 0 });
    return true;
  }

  if (path === 'push/test' && req.method === 'POST') {
    const delivery = await sendPushToUser(userId, {
      id: `test-${Date.now()}`,
      title: 'SPIP notifications are working',
      message: 'This device can receive meeting, task and follow-up reminders.',
      priority: 'high',
      source_type: 'custom',
      reminder_kind: 'test',
      metadata: { url: '/settings' },
    });
    res.status(delivery.delivered ? 200 : 409).json({ ok: delivery.delivered > 0, ...delivery });
    return true;
  }

  return false;
}

async function handlePhase6Ai(req: any, res: any, path: string) {
  if (path === 'gemini/assistant' && req.method === 'POST') {
    const result = await runPhase6Assistant(req);
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.body);
    return true;
  }

  if (path === 'ai/documents' && req.method === 'POST') {
    try {
      const result = await ingestDocument(req);
      res.setHeader('Cache-Control', 'no-store');
      res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error('[PHASE 6 DOCUMENT ERROR]', String(error?.message || error).slice(0, 300));
      res.status(500).json({ error: 'The source document could not be processed.' });
    }
    return true;
  }

  if (path === 'ai/artifacts' && req.method === 'POST') {
    try {
      const result = await generateArtifactV2(req);
      res.setHeader('Cache-Control', 'no-store');
      res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error('[PHASE 6 ARTIFACT ERROR]', String(error?.message || error).slice(0, 300));
      res.status(500).json({ error: 'The requested export could not be generated.' });
    }
    return true;
  }

  if (!path.startsWith('ai/')) return false;
  const identity = await authenticatePhase6(req);
  if (!identity) {
    res.status(401).json({ error: 'Authentication required.' });
    return true;
  }

  const parts = path.slice(3).split('/').filter(Boolean);
  const aiPath = parts.join('/');
  try {
    if (aiPath === 'status' && req.method === 'GET') {
      const configured = providerStatus();
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ready: configured.some((provider) => provider.configured),
        providers: configured,
        privacy: {
          conversationIsolation: 'per-user',
          directBrowserDatabaseAccess: false,
          confidentialRoutingRequiresApproval: true,
        },
      });
      return true;
    }
    if (aiPath === 'conversations' && req.method === 'GET') {
      res.json(await listUserConversations(identity));
      return true;
    }
    if (parts[0] === 'conversations' && parts[1] && req.method === 'GET') {
      const conversation = await getUserConversation(identity, parts[1]);
      if (!conversation) res.status(404).json({ error: 'Conversation not found.' });
      else res.json(conversation);
      return true;
    }
    if (parts[0] === 'conversations' && parts[1] && req.method === 'DELETE') {
      await deleteUserConversation(identity, parts[1]);
      res.json({ ok: true });
      return true;
    }
    res.status(404).json({ error: 'Phase 6 AI endpoint not found.' });
  } catch (error: any) {
    console.error('[PHASE 6 API ERROR]', aiPath, String(error?.message || error).slice(0, 300));
    res.status(500).json({ error: 'SCM Intelligence Copilot could not complete this request.' });
  }
  return true;
}

export default async function handler(req: any, res: any) {
  const rawPath = req.query?.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '').replace(/^\/+/, '');

  // Phase 6 AI must bypass the legacy Express/PostgreSQL availability gate. The
  // Copilot uses authenticated Supabase + server-side AI providers and should not
  // fail merely because an unrelated legacy DATABASE_URL is unavailable.
  if (await handlePhase6Ai(req, res, path)) return;

  // Handle Phase 4 push/cron traffic before Express body-parser. Supabase pg_net sends
  // an empty POST body, which the legacy Express stack can otherwise reject as invalid JSON.
  if (await handleNotificationHotfix(req, res, path)) return;

  // Phase 1 uses Supabase profiles as the authentication authority, while several
  // established CRM tables still reference public.users through foreign keys.
  // Mirror the authenticated profile before CRM/calendar/task writes reach Express.
  await ensureLegacyUserDirectoryEntry(req);

  if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'path')) {
    delete req.query.path;
  }

  const query = new URLSearchParams();
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        for (const item of value) query.append(key, String(item));
      } else if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }
  }

  req.url = `/api${path ? `/${path}` : ''}${query.toString() ? `?${query.toString()}` : ''}`;
  return app(req, res);
}
