import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, ChevronRight, LockKeyhole, MonitorCog, Settings2, ShieldCheck, UserRound, Smartphone, Send, BellOff } from 'lucide-react';
import { UserProfile } from '../types';
import { registerServiceWorkerAndSubscribe, unsubscribeUser, isPushSupported, getPushStatus, sendTestPush, getNotificationPreferences, saveNotificationPreferences } from '../services/pushService';
import { supabase } from '../lib/supabase';

interface SettingsProps { currentUser: UserProfile; }
type SectionKey = 'profile' | 'security' | 'notifications' | 'preferences' | 'administration';

const defaults = { push_enabled:true, meeting_24h:true, meeting_1h:true, meeting_10m:true, meeting_start:true, task_24h:true, task_1h:true, follow_up_enabled:true, quiet_hours_enabled:false };

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const isAdmin = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>(defaults);

  const sections = useMemo(() => {
    const rows:any[] = [
      { key:'profile', label:'Profile', description:'Your SCM identity and access level', icon:UserRound },
      { key:'security', label:'Password & Security', description:'Password recovery and session security', icon:LockKeyhole },
      { key:'notifications', label:'Notifications', description:'Meeting, task and follow-up reminders', icon:Bell },
      { key:'preferences', label:'Preferences', description:'Workspace display and behaviour', icon:Settings2 },
    ];
    if (isAdmin) rows.push({ key:'administration', label:'Administration', description:'Platform integration overview', icon:ShieldCheck });
    return rows;
  }, [isAdmin]);

  const refreshNotifications = async () => {
    try {
      const [status, preferences] = await Promise.all([getPushStatus(), getNotificationPreferences()]);
      setPushStatus(status); setPrefs({ ...defaults, ...(preferences || {}) });
    } catch { setPushStatus(null); }
  };
  useEffect(() => { if (activeSection === 'notifications') refreshNotifications(); }, [activeSection]);

  const sendPasswordReset = async () => {
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, { redirectTo: window.location.origin });
      if (error) throw error;
      setMessage('A secure password reset link has been sent to your SCM corporate email.');
    } catch (e:any) { setMessage(e?.message || 'Unable to send the reset link.'); }
    finally { setBusy(false); }
  };

  const enableNotifications = async () => {
    setBusy(true); setMessage('');
    try {
      if (!isPushSupported()) throw new Error('This browser does not support web push notifications.');
      const success = await registerServiceWorkerAndSubscribe();
      if (!success) throw new Error('Notification setup was not completed. Check browser notification permissions.');
      await refreshNotifications(); setMessage('Notifications are enabled for this device.');
    } catch (e:any) { setMessage(e?.message || 'Unable to enable notifications.'); }
    finally { setBusy(false); }
  };

  const disableNotifications = async () => {
    setBusy(true); setMessage('');
    try { await unsubscribeUser(); await refreshNotifications(); setMessage('Notifications were disabled for this device.'); }
    catch (e:any) { setMessage(e?.message || 'Unable to disable notifications.'); }
    finally { setBusy(false); }
  };

  const testNotifications = async () => {
    setBusy(true); setMessage('');
    try { await sendTestPush(); setMessage('Test notification sent. It should appear on this device shortly.'); }
    catch (e:any) { setMessage(e?.message || 'The test notification could not be delivered.'); }
    finally { setBusy(false); }
  };

  const togglePref = async (key:string, value:boolean) => {
    const next = { ...prefs, [key]: value }; setPrefs(next);
    try { await saveNotificationPreferences({ [key]: value }); }
    catch { setPrefs(prefs); setMessage('Unable to save that reminder preference.'); }
  };

  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Workspace settings</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Settings</h1><p className="mt-1 text-sm text-slate-500">Manage your account, security and reminder preferences.</p></div>
    {message && <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600"/><span>{message}</span></div>}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{sections.map((s:any)=>{const Icon=s.icon;const active=activeSection===s.key;return <button key={s.key} onClick={()=>{setActiveSection(s.key);setMessage('')}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${active?'bg-slate-950 text-white':'text-slate-600 hover:bg-slate-50'}`}><span className={`rounded-lg p-2 ${active?'bg-white/10':'bg-slate-100'}`}><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{s.label}</span><span className={`block text-[11px] ${active?'text-slate-300':'text-slate-400'}`}>{s.description}</span></span><ChevronRight className="h-4 w-4 opacity-60"/></button>})}</aside>
      <section className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeSection==='profile' && <div className="space-y-5"><div><h2 className="text-lg font-bold">Profile</h2><p className="text-sm text-slate-500">Your approved SCM SPIP identity.</p></div><div className="grid gap-4 sm:grid-cols-2"><InfoCard label="Full name" value={currentUser.fullName}/><InfoCard label="Corporate email" value={currentUser.email}/><InfoCard label="Department" value={currentUser.department||'Asset Management'}/><InfoCard label="Access level" value={currentUser.permissionLevel==='SUPER_ADMIN'?'Super Admin':currentUser.permissionLevel==='HOD_ADMIN'?'HOD Admin':'Staff'}/></div></div>}
        {activeSection==='security' && <div className="space-y-5"><div><h2 className="text-lg font-bold">Password & Security</h2><p className="text-sm text-slate-500">Authentication is handled by Supabase Auth.</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="font-semibold">Reset password</div><p className="mt-1 text-sm text-slate-500">Send a secure recovery link to {currentUser.email}.</p><button disabled={busy} onClick={sendPasswordReset} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Send reset link</button></div></div>}
        {activeSection==='notifications' && <div className="space-y-6"><div><h2 className="text-lg font-bold">Notifications & Reminders</h2><p className="text-sm text-slate-500">SPIP can remind you even when the active page is closed, once this device is subscribed and the background dispatcher is configured.</p></div>
          <div className="grid gap-4 sm:grid-cols-3"><InfoCard label="Browser permission" value={typeof Notification!=='undefined'?Notification.permission:'unsupported'}/><InfoCard label="Active devices" value={String(pushStatus?.activeDevices ?? 0)}/><InfoCard label="Push service" value={pushStatus?.configured?'Configured':'Needs configuration'}/></div>
          <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={enableNotifications} className="rounded-lg bg-[#b1191f] px-4 py-2 text-sm font-semibold text-white"><Smartphone className="mr-2 inline h-4 w-4"/>Enable this device</button><button disabled={busy||!pushStatus?.activeDevices} onClick={testNotifications} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"><Send className="mr-2 inline h-4 w-4"/>Send test</button><button disabled={busy||!pushStatus?.activeDevices} onClick={disableNotifications} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"><BellOff className="mr-2 inline h-4 w-4"/>Disable this device</button></div>
          <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Reminder schedule</h3><p className="mt-1 text-xs text-slate-500">Meeting reminders are generated automatically whenever a meeting is created or rescheduled.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['meeting_24h','24 hours before meetings'],['meeting_1h','1 hour before meetings'],['meeting_10m','10 minutes before meetings'],['meeting_start','At meeting start'],['task_24h','24 hours before tasks'],['task_1h','1 hour before tasks'],['follow_up_enabled','Follow-up reminders']].map(([k,l])=><label key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3 text-sm"><span>{l}</span><input type="checkbox" checked={Boolean(prefs[k])} onChange={e=>togglePref(k,e.target.checked)} className="h-4 w-4 accent-[#b1191f]"/></label>)}</div></div>
        </div>}
        {activeSection==='preferences' && <div className="space-y-5"><div><h2 className="text-lg font-bold">Workspace Preferences</h2><p className="text-sm text-slate-500">Defaults used across SPIP.</p></div><div className="grid gap-4 sm:grid-cols-2"><InfoCard label="Interface" value="SCM Corporate"/><InfoCard label="Workspace" value="Asset Management"/><InfoCard label="Currency" value="Nigerian Naira (₦)"/><InfoCard label="Time zone" value="West Africa Time (Africa/Lagos)"/></div></div>}
        {activeSection==='administration'&&isAdmin&&<div className="space-y-5"><div><h2 className="text-lg font-bold">Administration</h2><p className="text-sm text-slate-500">Server-side integration status. Secret values are never shown here.</p></div><div className="grid gap-4 sm:grid-cols-2"><StatusCard title="Authentication" detail="Supabase Auth"/><StatusCard title="Reminder storage" detail="Supabase PostgreSQL"/><StatusCard title="Background push" detail={pushStatus?.configured?'VAPID configured':'VAPID needs attention'}/><StatusCard title="Hosting" detail="Vercel"/></div><div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><MonitorCog className="h-5 w-5 shrink-0"/><span>Phase 4 background dispatch requires the secured scheduler configuration documented with the Phase 4 migration.</span></div></div>}
      </section>
    </div>
  </div>;
};

const InfoCard=({label,value}:{label:string;value:string})=><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div><div className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</div></div>;
const StatusCard=({title,detail}:{title:string;detail:string})=><div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-600"/>{title}</div><div className="mt-2 text-sm text-slate-500">{detail}</div></div>;
