import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const serverModule = require('../dist/server.cjs');
const app = serverModule.default || serverModule;

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const serverKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim() || '';
const phase4Supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  serverKey || 'missing-key',
  { auth: { persistSession: false, autoRefreshToken: false } },
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

const clean = (value: any, max = 500) => String(value ?? '').trim().slice(0, max);

async function currentUser(req: any) {
  const authorization = String(req.headers?.authorization || '');
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  const { data, error } = await phase4Supabase.auth.getUser(token);
  if (error || !data.user?.id) return null;
  const { data: profile } = await phase4Supabase
    .from('profiles')
    .select('id,email,full_name,status,permission_level')
    .eq('id', data.user.id)
    .maybeSingle();
  return profile?.status === 'ACTIVE' ? profile : null;
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function mapReminder(r: any) {
  return {
    id: r.id,
    sourceType: r.source_type,
    sourceId: r.source_id,
    prospectId: r.prospect_id,
    prospectName: r.prospect_name,
    title: r.title,
    message: r.message,
    reminderKind: r.reminder_kind,
    scheduledFor: r.scheduled_for,
    status: r.status,
    priority: r.priority,
    sentAt: r.sent_at,
    metadata: r.metadata || {},
    createdAt: r.created_at,
  };
}

function currentWatMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function timeToMinutes(value: string | null | undefined, fallback: number) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return Math.max(0, Math.min(1439, Number(match[1]) * 60 + Number(match[2])));
}

function inQuietHours(preferences: any) {
  if (!preferences?.quiet_hours_enabled) return false;
  const now = currentWatMinutes();
  const start = timeToMinutes(preferences.quiet_hours_start, 21 * 60);
  const end = timeToMinutes(preferences.quiet_hours_end, 7 * 60);
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

async function notificationPreferences(userId: string) {
  const { data } = await phase4Supabase
    .from('spip_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data || { push_enabled: true, quiet_hours_enabled: false };
}

async function sendPushToUser(userId: string, reminder: any) {
  if (!vapidPublic || !vapidPrivate) return { delivered: 0, failed: 0, reason: 'VAPID_NOT_CONFIGURED' };
  const { data: subscriptions, error } = await phase4Supabase
    .from('spip_push_subscriptions').select('*').eq('user_id', userId).eq('is_active', true);
  if (error) throw error;
  if (!subscriptions?.length) return { delivered: 0, failed: 0, reason: 'NO_ACTIVE_DEVICE' };

  const payload = JSON.stringify({
    id: reminder.id,
    title: reminder.title,
    message: reminder.message,
    priority: reminder.priority,
    type: reminder.source_type,
    reminderKind: reminder.reminder_kind,
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
      await phase4Supabase.from('spip_push_subscriptions')
        .update({ last_seen_at: new Date().toISOString() }).eq('id', subscription.id);
    } catch (error: any) {
      failed += 1;
      const status = Number(error?.statusCode || 0);
      if (status === 404 || status === 410) {
        await phase4Supabase.from('spip_push_subscriptions').update({ is_active: false }).eq('id', subscription.id);
      }
    }
  }
  return { delivered, failed, reason: delivered ? null : 'DELIVERY_FAILED' };
}

async function claimReminder(reminder: any) {
  const attempts = Number(reminder.attempt_count || 0);
  const { data, error } = await phase4Supabase
    .from('spip_reminders')
    .update({ attempt_count: attempts + 1, next_attempt_at: new Date(Date.now() + 120_000).toISOString(), updated_at: new Date().toISOString() })
    .eq('id', reminder.id)
    .eq('status', 'PENDING')
    .eq('attempt_count', attempts)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function dispatchDue(onlyUserId?: string) {
  const now = new Date().toISOString();
  let query = phase4Supabase
    .from('spip_reminders')
    .select('*')
    .eq('status', 'PENDING')
    .lte('scheduled_for', now)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order('scheduled_for', { ascending: true })
    .limit(100);
  if (onlyUserId) query = query.eq('user_id', onlyUserId);
  const { data: reminders, error } = await query;
  if (error) throw error;

  const result = { scanned: reminders?.length || 0, sent: 0, deferred: 0, failed: 0, skipped: 0 };
  for (const candidate of reminders || []) {
    const reminder = await claimReminder(candidate);
    if (!reminder) { result.skipped += 1; continue; }

    if (reminder.expires_at && new Date(reminder.expires_at).getTime() < Date.now()) {
      await phase4Supabase.from('spip_reminders')
        .update({ status: 'FAILED', next_attempt_at: null, last_error: 'REMINDER_EXPIRED', updated_at: now })
        .eq('id', reminder.id);
      result.failed += 1;
      continue;
    }

    const preferences = await notificationPreferences(reminder.user_id);
    if (preferences.push_enabled === false) {
      await phase4Supabase.from('spip_reminders').update({ last_error: 'PUSH_DISABLED_BY_USER', next_attempt_at: new Date(Date.now() + 3_600_000).toISOString(), updated_at: now }).eq('id', reminder.id);
      result.deferred += 1;
      continue;
    }
    if (reminder.priority !== 'critical' && inQuietHours(preferences)) {
      await phase4Supabase.from('spip_reminders').update({ last_error: 'QUIET_HOURS', next_attempt_at: new Date(Date.now() + 900_000).toISOString(), updated_at: now }).eq('id', reminder.id);
      result.deferred += 1;
      continue;
    }

    try {
      const delivery = await sendPushToUser(reminder.user_id, reminder);
      if (delivery.delivered > 0) {
        await phase4Supabase.from('spip_reminders').update({ status: 'SENT', sent_at: now, next_attempt_at: null, last_error: null, updated_at: now }).eq('id', reminder.id);
        await phase4Supabase.from('spip_notification_events').insert({ user_id: reminder.user_id, reminder_id: reminder.id, title: reminder.title, message: reminder.message, category: reminder.source_type, priority: reminder.priority });
        result.sent += 1;
      } else {
        const attempts = Number(reminder.attempt_count || 1);
        const minutes = Math.min(60, Math.max(5, 2 ** Math.min(attempts, 5)));
        await phase4Supabase.from('spip_reminders').update({ last_error: delivery.reason, next_attempt_at: new Date(Date.now() + minutes * 60_000).toISOString(), updated_at: now }).eq('id', reminder.id);
        result.deferred += 1;
      }
    } catch (error: any) {
      const attempts = Number(reminder.attempt_count || 1);
      await phase4Supabase.from('spip_reminders').update({ last_error: clean(error?.message || 'DISPATCH_ERROR', 300), next_attempt_at: new Date(Date.now() + Math.min(60, attempts * 10) * 60_000).toISOString(), updated_at: now }).eq('id', reminder.id);
      result.failed += 1;
    }
  }
  return result;
}

async function resyncGeneratedReminders(userId: string) {
  const [{ data: meetings }, { data: tasks }] = await Promise.all([
    phase4Supabase.from('meetings').select('id,date').eq('officer_id', userId).limit(250),
    phase4Supabase.from('tasks').select('id,due_date').eq('officer_id', userId).eq('is_completed', false).limit(250),
  ]);
  for (const meeting of meetings || []) await phase4Supabase.from('meetings').update({ date: meeting.date }).eq('id', meeting.id);
  for (const task of tasks || []) await phase4Supabase.from('tasks').update({ due_date: task.due_date }).eq('id', task.id);
}

async function handlePhase4(req: any, res: any, path: string): Promise<boolean> {
  if (path === 'push/public-key' && req.method === 'GET') {
    res.status(vapidPublic ? 200 : 503).json(vapidPublic ? { publicKey: vapidPublic } : { error: 'Push notifications are not configured.' });
    return true;
  }

  if (path === 'reminders/dispatch' && req.method === 'POST') {
    const configured = process.env.REMINDER_CRON_SECRET || '';
    const supplied = String(req.headers['x-spip-reminder-secret'] || req.headers.authorization?.replace(/^Bearer\s+/i, '') || '');
    if (!configured || !supplied || !safeEqual(configured, supplied)) {
      res.status(401).json({ error: 'Reminder dispatcher authorization failed.' });
      return true;
    }
    try { res.json({ ok: true, ...(await dispatchDue()) }); }
    catch (error: any) { res.status(500).json({ error: 'Reminder dispatch failed.', detail: clean(error?.message, 300) }); }
    return true;
  }

  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'Authentication required.' }); return true; }

  if (path === 'reminders/dispatch-self' && req.method === 'POST') {
    try { res.json({ ok: true, ...(await dispatchDue(user.id)) }); }
    catch (error: any) { res.status(500).json({ error: 'Reminder sync failed.', detail: clean(error?.message, 300) }); }
    return true;
  }

  if (path === 'push/subscribe' && req.method === 'POST') {
    const subscription = req.body?.subscription;
    const endpoint = clean(subscription?.endpoint, 2000);
    const p256dh = clean(subscription?.keys?.p256dh, 1000);
    const auth = clean(subscription?.keys?.auth, 1000);
    if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: 'Invalid push subscription.' }); return true; }
    const { error } = await phase4Supabase.from('spip_push_subscriptions').upsert({ user_id: user.id, endpoint, p256dh, auth, user_agent: clean(req.headers['user-agent'], 500), is_active: true, last_seen_at: new Date().toISOString() }, { onConflict: 'endpoint' });
    if (error) res.status(500).json({ error: 'Unable to register this device.' });
    else {
      await phase4Supabase.from('spip_notification_preferences').upsert({ user_id: user.id, push_enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      res.status(201).json({ ok: true });
    }
    return true;
  }

  if (path === 'push/unsubscribe' && req.method === 'POST') {
    const endpoint = clean(req.body?.endpoint, 2000);
    await phase4Supabase.from('spip_push_subscriptions').update({ is_active: false, last_seen_at: new Date().toISOString() }).eq('user_id', user.id).eq('endpoint', endpoint);
    res.json({ ok: true }); return true;
  }

  if (path === 'push/status' && req.method === 'GET') {
    const [{ data: preferences }, { count }] = await Promise.all([
      phase4Supabase.from('spip_notification_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      phase4Supabase.from('spip_push_subscriptions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
    ]);
    res.json({ configured: Boolean(vapidPublic && vapidPrivate), activeDevices: count || 0, preferences: preferences || null });
    return true;
  }

  if (path === 'push/test' && req.method === 'POST') {
    const delivery = await sendPushToUser(user.id, { id: `test-${Date.now()}`, title: 'SPIP notifications are working', message: 'This device can receive meeting, task and follow-up reminders.', priority: 'high', source_type: 'custom', reminder_kind: 'test', metadata: { url: '/settings' } });
    res.status(delivery.delivered ? 200 : 409).json({ ok: delivery.delivered > 0, ...delivery });
    return true;
  }

  if (path === 'reminders' && req.method === 'GET') {
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 50)));
    const { data, error } = await phase4Supabase.from('spip_reminders').select('*').eq('user_id', user.id).order('scheduled_for', { ascending: true }).limit(limit);
    if (error) res.status(500).json({ error: 'Unable to load reminders.' }); else res.json((data || []).map(mapReminder));
    return true;
  }

  if (path === 'reminders/custom' && req.method === 'POST') {
    const scheduled = new Date(req.body?.scheduledFor || '');
    if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= Date.now()) { res.status(400).json({ error: 'Choose a future reminder time.' }); return true; }
    const title = clean(req.body?.title, 160);
    const message = clean(req.body?.message, 800);
    if (!title) { res.status(400).json({ error: 'Reminder title is required.' }); return true; }
    const sourceId = clean(req.body?.sourceId, 160) || `custom-${crypto.randomUUID()}`;
    const { data, error } = await phase4Supabase.from('spip_reminders').upsert({ user_id: user.id, source_type: req.body?.sourceType === 'follow_up' ? 'follow_up' : 'custom', source_id: sourceId, prospect_id: clean(req.body?.prospectId, 200) || null, prospect_name: clean(req.body?.prospectName, 200) || null, title, message: message || title, reminder_kind: 'custom', scheduled_for: scheduled.toISOString(), priority: ['normal', 'high', 'critical'].includes(req.body?.priority) ? req.body.priority : 'normal', status: 'PENDING', next_attempt_at: null, sent_at: null, last_error: null, expires_at: new Date(scheduled.getTime() + 86_400_000).toISOString(), metadata: { url: req.body?.url || '/calendar' }, updated_at: new Date().toISOString() }, { onConflict: 'user_id,source_type,source_id,reminder_kind' }).select('*').single();
    if (error) res.status(500).json({ error: 'Unable to create reminder.' }); else res.status(201).json(mapReminder(data));
    return true;
  }

  const snooze = path.match(/^reminders\/([^/]+)\/snooze$/);
  if (snooze && req.method === 'POST') {
    const minutes = Math.min(1440, Math.max(5, Number(req.body?.minutes || 10)));
    const { data, error } = await phase4Supabase.from('spip_reminders').update({ status: 'PENDING', scheduled_for: new Date(Date.now() + minutes * 60_000).toISOString(), next_attempt_at: null, sent_at: null, last_error: null, updated_at: new Date().toISOString() }).eq('id', snooze[1]).eq('user_id', user.id).select('*').maybeSingle();
    if (error || !data) res.status(404).json({ error: 'Reminder not found.' }); else res.json(mapReminder(data));
    return true;
  }

  const cancel = path.match(/^reminders\/([^/]+)$/);
  if (cancel && req.method === 'DELETE') {
    await phase4Supabase.from('spip_reminders').update({ status: 'CANCELLED', next_attempt_at: null, updated_at: new Date().toISOString() }).eq('id', cancel[1]).eq('user_id', user.id);
    res.json({ ok: true }); return true;
  }

  if (path === 'notification-preferences' && req.method === 'GET') {
    const { data } = await phase4Supabase.from('spip_notification_preferences').select('*').eq('user_id', user.id).maybeSingle();
    res.json(data || { user_id: user.id }); return true;
  }

  if (path === 'notification-preferences' && req.method === 'PATCH') {
    const allowed = ['push_enabled', 'meeting_24h', 'meeting_1h', 'meeting_10m', 'meeting_start', 'task_24h', 'task_1h', 'follow_up_enabled', 'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end'];
    const patch: any = { user_id: user.id, updated_at: new Date().toISOString() };
    for (const key of allowed) if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    const { data, error } = await phase4Supabase.from('spip_notification_preferences').upsert(patch, { onConflict: 'user_id' }).select('*').single();
    if (error) res.status(500).json({ error: 'Unable to save notification preferences.' });
    else { await resyncGeneratedReminders(user.id); res.json(data); }
    return true;
  }

  return false;
}

export default async function handler(req: any, res: any) {
  const rawPath = req.query?.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '').replace(/^\/+/, '');

  if (path.startsWith('push/') || path === 'reminders' || path.startsWith('reminders/') || path === 'notification-preferences') {
    const handled = await handlePhase4(req, res, path);
    if (handled) return;
  }

  if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'path')) delete req.query.path;
  const query = new URLSearchParams();
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) for (const item of value) query.append(key, String(item));
      else if (value !== undefined && value !== null) query.set(key, String(value));
    }
  }
  req.url = `/api${path ? `/${path}` : ''}${query.toString() ? `?${query.toString()}` : ''}`;
  return app(req, res);
}
