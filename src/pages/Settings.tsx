import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, BellOff, CalendarClock, CheckCircle2, ChevronRight, Clock3, LockKeyhole,
  MonitorCog, Send, Settings2, ShieldCheck, Smartphone, Trash2, UserRound,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  registerServiceWorkerAndSubscribe,
  unsubscribeUser,
  isPushSupported,
  getPushStatus,
  sendTestPush,
  getNotificationPreferences,
  saveNotificationPreferences,
  createCustomReminder,
  getReminders,
  snoozeReminder,
  cancelReminder,
} from '../services/pushService';
import { supabase } from '../lib/supabase';

interface SettingsProps { currentUser: UserProfile; }
type SectionKey = 'profile' | 'security' | 'notifications' | 'preferences' | 'administration';

const defaults = {
  push_enabled: true, meeting_24h: true, meeting_1h: true, meeting_10m: true,
  meeting_start: true, task_24h: true, task_1h: true, follow_up_enabled: true,
  quiet_hours_enabled: false,
};

const localDateTimeMinimum = () => {
  const now = new Date(Date.now() + 5 * 60_000);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const isAdmin = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(defaults);
  const [reminders, setReminders] = useState<any[]>([]);
  const [followUp, setFollowUp] = useState({ title: '', message: '', scheduledFor: localDateTimeMinimum() });

  const sections = useMemo(() => {
    const rows: any[] = [
      { key: 'profile', label: 'Profile', description: 'Your SCM identity and access level', icon: UserRound },
      { key: 'security', label: 'Password & Security', description: 'Password recovery and session security', icon: LockKeyhole },
      { key: 'notifications', label: 'Notifications', description: 'Meeting, task and follow-up reminders', icon: Bell },
      { key: 'preferences', label: 'Preferences', description: 'Workspace display and behaviour', icon: Settings2 },
    ];
    if (isAdmin) rows.push({ key: 'administration', label: 'Administration', description: 'Platform integration overview', icon: ShieldCheck });
    return rows;
  }, [isAdmin]);

  const refreshNotifications = async () => {
    try {
      const [status, preferences, reminderRows] = await Promise.all([
        getPushStatus(), getNotificationPreferences(), getReminders(40),
      ]);
      setPushStatus(status);
      setPrefs({ ...defaults, ...(preferences || {}) });
      setReminders(Array.isArray(reminderRows) ? reminderRows : []);
    } catch {
      setPushStatus(null);
    }
  };

  useEffect(() => { if (activeSection === 'notifications') refreshNotifications(); }, [activeSection]);

  const sendPasswordReset = async () => {
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, { redirectTo: window.location.origin });
      if (error) throw error;
      setMessage('A secure password reset link has been sent to your SCM corporate email.');
    } catch (error: any) { setMessage(error?.message || 'Unable to send the reset link.'); }
    finally { setBusy(false); }
  };

  const enableNotifications = async () => {
    setBusy(true); setMessage('');
    try {
      if (!isPushSupported()) throw new Error('This browser does not support web push notifications.');
      const success = await registerServiceWorkerAndSubscribe();
      if (!success) throw new Error('Notification setup was not completed. Check browser notification permissions.');
      await refreshNotifications();
      setMessage('Notifications are enabled for this device.');
    } catch (error: any) { setMessage(error?.message || 'Unable to enable notifications.'); }
    finally { setBusy(false); }
  };

  const disableNotifications = async () => {
    setBusy(true); setMessage('');
    try {
      await unsubscribeUser();
      await refreshNotifications();
      setMessage('Notifications were disabled for this device.');
    } catch (error: any) { setMessage(error?.message || 'Unable to disable notifications.'); }
    finally { setBusy(false); }
  };

  const testNotifications = async () => {
    setBusy(true); setMessage('');
    try {
      await sendTestPush();
      setMessage('Test notification sent. It should appear on this device shortly.');
    } catch (error: any) { setMessage(error?.message || 'The test notification could not be delivered.'); }
    finally { setBusy(false); }
  };

  const togglePref = async (key: string, value: boolean) => {
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    try {
      await saveNotificationPreferences({ [key]: value });
      await refreshNotifications();
    } catch {
      setPrefs(previous);
      setMessage('Unable to save that reminder preference.');
    }
  };

  const createFollowUp = async () => {
    setBusy(true); setMessage('');
    try {
      if (!followUp.title.trim()) throw new Error('Enter a follow-up title.');
      const scheduled = new Date(followUp.scheduledFor);
      if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= Date.now()) throw new Error('Choose a future reminder time.');
      await createCustomReminder({
        title: followUp.title.trim(),
        message: followUp.message.trim() || followUp.title.trim(),
        scheduledFor: scheduled.toISOString(),
        sourceType: 'follow_up',
        priority: 'high',
        url: '/calendar',
      });
      setFollowUp({ title: '', message: '', scheduledFor: localDateTimeMinimum() });
      await refreshNotifications();
      setMessage('Follow-up reminder created.');
    } catch (error: any) { setMessage(error?.message || 'Unable to create the reminder.'); }
    finally { setBusy(false); }
  };

  const reminderAction = async (action: 'snooze' | 'cancel', id: string) => {
    setBusy(true); setMessage('');
    try {
      if (action === 'snooze') await snoozeReminder(id, 10);
      else await cancelReminder(id);
      await refreshNotifications();
      setMessage(action === 'snooze' ? 'Reminder snoozed for 10 minutes.' : 'Reminder cancelled.');
    } catch (error: any) { setMessage(error?.message || 'Unable to update the reminder.'); }
    finally { setBusy(false); }
  };

  const upcoming = reminders.filter((r) => r.status === 'PENDING').slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Workspace settings</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account, security and reminder preferences.</p>
      </div>

      {message && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {sections.map((section: any) => {
            const Icon = section.icon;
            const active = activeSection === section.key;
            return (
              <button key={section.key} onClick={() => { setActiveSection(section.key); setMessage(''); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className={`rounded-lg p-2 ${active ? 'bg-white/10' : 'bg-slate-100'}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{section.label}</span><span className={`block text-[11px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{section.description}</span></span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>
            );
          })}
        </aside>

        <section className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeSection === 'profile' && (
            <div className="space-y-5"><div><h2 className="text-lg font-bold">Profile</h2><p className="text-sm text-slate-500">Your approved SCM SPIP identity.</p></div><div className="grid gap-4 sm:grid-cols-2"><InfoCard label="Full name" value={currentUser.fullName} /><InfoCard label="Corporate email" value={currentUser.email} /><InfoCard label="Department" value={currentUser.department || 'Asset Management'} /><InfoCard label="Access level" value={currentUser.permissionLevel === 'SUPER_ADMIN' ? 'Super Admin' : currentUser.permissionLevel === 'HOD_ADMIN' ? 'HOD Admin' : 'Staff'} /></div></div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-5"><div><h2 className="text-lg font-bold">Password & Security</h2><p className="text-sm text-slate-500">Authentication is handled by Supabase Auth.</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="font-semibold">Reset password</div><p className="mt-1 text-sm text-slate-500">Send a secure recovery link to {currentUser.email}.</p><button disabled={busy} onClick={sendPasswordReset} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Send reset link</button></div></div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div><h2 className="text-lg font-bold">Notifications & Reminders</h2><p className="text-sm text-slate-500">Enable this device once, then SPIP can deliver meeting, task and follow-up reminders in the background.</p></div>
              <div className="grid gap-4 sm:grid-cols-3"><InfoCard label="Browser permission" value={typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'} /><InfoCard label="Active devices" value={String(pushStatus?.activeDevices ?? 0)} /><InfoCard label="Push service" value={pushStatus?.configured ? 'Configured' : 'Needs configuration'} /></div>
              <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={enableNotifications} className="rounded-lg bg-[#b1191f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Smartphone className="mr-2 inline h-4 w-4" />Enable this device</button><button disabled={busy || !pushStatus?.activeDevices} onClick={testNotifications} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"><Send className="mr-2 inline h-4 w-4" />Send test</button><button disabled={busy || !pushStatus?.activeDevices} onClick={disableNotifications} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"><BellOff className="mr-2 inline h-4 w-4" />Disable this device</button></div>

              <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Automatic reminder schedule</h3><p className="mt-1 text-xs text-slate-500">Rescheduling a meeting automatically replaces its pending reminders instead of duplicating them.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['meeting_24h', '24 hours before meetings'], ['meeting_1h', '1 hour before meetings'], ['meeting_10m', '10 minutes before meetings'], ['meeting_start', 'At meeting start'], ['task_24h', '24 hours before tasks'], ['task_1h', '1 hour before tasks'], ['follow_up_enabled', 'Follow-up reminders'], ['quiet_hours_enabled', 'Quiet hours for non-critical alerts']].map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3 text-sm"><span>{label}</span><input type="checkbox" checked={Boolean(prefs[key])} onChange={(event) => togglePref(key, event.target.checked)} className="h-4 w-4 accent-[#b1191f]" /></label>)}</div></div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#b1191f]" /><h3 className="font-semibold text-slate-900">Create a follow-up reminder</h3></div>
                  <div className="mt-4 space-y-3"><input value={followUp.title} onChange={(e) => setFollowUp({ ...followUp, title: e.target.value })} placeholder="e.g. Call ABC Ltd treasury team" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><textarea value={followUp.message} onChange={(e) => setFollowUp({ ...followUp, message: e.target.value })} placeholder="Optional note" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input type="datetime-local" min={localDateTimeMinimum()} value={followUp.scheduledFor} onChange={(e) => setFollowUp({ ...followUp, scheduledFor: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button disabled={busy} onClick={createFollowUp} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create reminder</button></div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#b1191f]" /><h3 className="font-semibold text-slate-900">Upcoming reminders</h3></div><span className="text-xs text-slate-400">{upcoming.length}</span></div>
                  <div className="mt-4 space-y-2">{upcoming.length === 0 ? <div className="rounded-lg bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">No pending reminders.</div> : upcoming.map((reminder) => <div key={reminder.id} className="rounded-lg border border-slate-200 px-3 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{reminder.title}</div><div className="mt-1 text-xs text-slate-500">{new Date(reminder.scheduledFor).toLocaleString()}</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${reminder.priority === 'critical' ? 'bg-red-50 text-red-700' : reminder.priority === 'high' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{reminder.priority}</span></div><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => reminderAction('snooze', reminder.id)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">Snooze 10m</button><button disabled={busy} onClick={() => reminderAction('cancel', reminder.id)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"><Trash2 className="mr-1 inline h-3 w-3" />Cancel</button></div></div>)}</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'preferences' && <div className="space-y-5"><div><h2 className="text-lg font-bold">Workspace Preferences</h2><p className="text-sm text-slate-500">Defaults used across SPIP.</p></div><div className="grid gap-4 sm:grid-cols-2"><InfoCard label="Interface" value="SCM Corporate" /><InfoCard label="Workspace" value="Asset Management" /><InfoCard label="Currency" value="Nigerian Naira (₦)" /><InfoCard label="Time zone" value="West Africa Time (Africa/Lagos)" /></div></div>}

          {activeSection === 'administration' && isAdmin && <div className="space-y-5"><div><h2 className="text-lg font-bold">Administration</h2><p className="text-sm text-slate-500">Server-side integration status. Secret values are never shown here.</p></div><div className="grid gap-4 sm:grid-cols-2"><StatusCard title="Authentication" detail="Supabase Auth" /><StatusCard title="Reminder storage" detail="Supabase PostgreSQL" /><StatusCard title="Background push" detail={pushStatus?.configured ? 'VAPID configured' : 'VAPID needs attention'} /><StatusCard title="Hosting" detail="Vercel" /></div><div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><MonitorCog className="h-5 w-5 shrink-0" /><span>Background reminders require the secured Phase 4 scheduler. The app also runs a foreground safety check once per minute while SPIP is open.</span></div></div>}
        </section>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div><div className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</div></div>;
const StatusCard = ({ title, detail }: { title: string; detail: string }) => <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-600" />{title}</div><div className="mt-2 text-sm text-slate-500">{detail}</div></div>;
