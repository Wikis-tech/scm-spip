import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Link2,
  LockKeyhole,
  Mail,
  MonitorCog,
  Settings2,
  ShieldCheck,
  Unplug,
  UserRound,
} from 'lucide-react';
import { UserProfile } from '../types';
import { registerServiceWorkerAndSubscribe, isPushSupported } from '../services/pushService';
import { microsoft365Service, Microsoft365Status } from '../services/microsoft365Service';
import { supabase } from '../lib/supabase';

interface SettingsProps { currentUser: UserProfile; }
type SectionKey = 'profile' | 'security' | 'notifications' | 'integrations' | 'preferences' | 'administration';

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const isAdmin = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [message, setMessage] = useState<string>('');
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [busy, setBusy] = useState(false);
  const [microsoft, setMicrosoft] = useState<Microsoft365Status | null>(null);

  const sections = useMemo(() => {
    const rows: { key: SectionKey; label: string; description: string; icon: any }[] = [
      { key: 'profile', label: 'Profile', description: 'Your SCM identity and access level', icon: UserRound },
      { key: 'security', label: 'Password & Security', description: 'Password recovery and session security', icon: LockKeyhole },
      { key: 'notifications', label: 'Notifications', description: 'Browser and meeting reminder preferences', icon: Bell },
      { key: 'integrations', label: 'Microsoft 365', description: 'Outlook email and calendar connection', icon: Link2 },
      { key: 'preferences', label: 'Preferences', description: 'Workspace display and behaviour', icon: Settings2 },
    ];
    if (isAdmin) rows.push({ key: 'administration', label: 'Administration', description: 'Platform integration overview', icon: ShieldCheck });
    return rows;
  }, [isAdmin]);

  const loadMicrosoftStatus = async () => {
    try { setMicrosoft(await microsoft365Service.status()); }
    catch { setMicrosoft({ configured: false, connected: false }); }
  };

  useEffect(() => {
    loadMicrosoftStatus();
    const params = new URLSearchParams(window.location.search);
    const result = params.get('microsoft');
    if (result === 'connected') {
      setActiveSection('integrations');
      setMessageTone('success');
      setMessage('Microsoft 365 connected successfully. Outlook calendar and mail are now available to SPIP.');
      window.history.replaceState({}, '', '/settings');
    } else if (result === 'error') {
      setActiveSection('integrations');
      setMessageTone('error');
      setMessage(params.get('message') || 'Microsoft 365 connection failed.');
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const sendPasswordReset = async () => {
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, { redirectTo: window.location.origin });
      if (error) throw error;
      setMessageTone('success'); setMessage('A secure password reset link has been sent to your SCM corporate email.');
    } catch (error: any) { setMessageTone('error'); setMessage(error?.message || 'Unable to send the password reset email right now.'); }
    finally { setBusy(false); }
  };

  const enableNotifications = async () => {
    setBusy(true); setMessage('');
    try {
      if (!isPushSupported()) { setMessageTone('error'); setMessage('Push notifications are not supported in this browser.'); return; }
      const success = await registerServiceWorkerAndSubscribe(currentUser.id, currentUser.email, currentUser.role);
      setMessageTone(success ? 'success' : 'error');
      setMessage(success ? 'Notifications are enabled for this device.' : 'Notification setup was not completed. Check your browser permission and try again.');
    } catch (error: any) { setMessageTone('error'); setMessage(error?.message || 'Unable to enable notifications right now.'); }
    finally { setBusy(false); }
  };

  const connectMicrosoft = async () => {
    setBusy(true); setMessage('');
    try { await microsoft365Service.connect(); }
    catch (error: any) { setMessageTone('error'); setMessage(error?.message || 'Unable to start Microsoft 365 connection.'); setBusy(false); }
  };

  const disconnectMicrosoft = async () => {
    if (!window.confirm('Disconnect Microsoft 365 from SPIP on this account? Existing Outlook events and sent mail will remain in Microsoft 365.')) return;
    setBusy(true); setMessage('');
    try {
      await microsoft365Service.disconnect();
      await loadMicrosoftStatus();
      setMessageTone('success'); setMessage('Microsoft 365 has been disconnected from SPIP.');
    } catch (error: any) { setMessageTone('error'); setMessage(error?.message || 'Unable to disconnect Microsoft 365.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Workspace settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage your account, security, notifications and approved work integrations without exposing technical secrets.</p>
      </div>

      {message && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${messageTone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {sections.map((section) => {
            const Icon = section.icon; const active = activeSection === section.key;
            return <button key={section.key} onClick={() => { setActiveSection(section.key); setMessage(''); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>
              <span className={`rounded-lg p-2 ${active ? 'bg-white/10' : 'bg-slate-100'}`}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{section.label}</span><span className={`mt-0.5 block text-[11px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{section.description}</span></span>
              <ChevronRight className="h-4 w-4 opacity-60" />
            </button>;
          })}
        </aside>

        <section className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeSection === 'profile' && <div className="space-y-6"><Heading title="Profile" text="Your identity is managed through SCM Capital's approved SPIP directory." /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><InfoCard label="Full name" value={currentUser.fullName} /><InfoCard label="Corporate email" value={currentUser.email} /><InfoCard label="Department" value={currentUser.department || 'Asset Management'} /><InfoCard label="Access level" value={currentUser.permissionLevel === 'SUPER_ADMIN' ? 'Super Admin' : currentUser.permissionLevel === 'HOD_ADMIN' ? 'HOD Admin' : 'Staff'} /></div></div>}

          {activeSection === 'security' && <div className="space-y-6"><Heading title="Password & Security" text="Authentication is handled by Supabase Auth. SPIP never stores your password in the CRM database." /><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-[#b1191f]" /><div className="flex-1"><div className="font-semibold text-slate-900">Reset password</div><p className="mt-1 text-sm text-slate-500">Send a secure recovery link to {currentUser.email}.</p><button disabled={busy} onClick={sendPasswordReset} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Send reset link</button></div></div></div></div>}

          {activeSection === 'notifications' && <div className="space-y-6"><Heading title="Notifications" text="Enable browser notifications for meeting, task and follow-up reminders on this device." /><div className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-slate-900">Browser notifications</div><p className="mt-1 text-sm text-slate-500">Current permission: <span className="font-medium text-slate-700">{typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'}</span></p></div><button disabled={busy} onClick={enableNotifications} className="rounded-lg bg-[#b1191f] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Enable notifications</button></div></div></div>}

          {activeSection === 'integrations' && <div className="space-y-6">
            <Heading title="Microsoft 365" text="Connect your own SCM Capital Microsoft 365 account to use Outlook mail and calendar from SPIP." />
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Mail className="h-5 w-5" /></span><div><div className="font-semibold text-slate-950">Outlook Mail + Calendar</div><p className="mt-1 max-w-xl text-sm text-slate-500">Send relationship emails from your SCM mailbox and publish SPIP meetings into your Outlook calendar. Access is delegated per employee and can be revoked at any time.</p></div></div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${microsoft?.connected ? 'bg-emerald-50 text-emerald-700' : microsoft?.configured ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{microsoft?.connected ? 'Connected' : microsoft?.configured ? 'Not connected' : 'Admin setup required'}</span>
              </div>
              {microsoft?.connected && <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><InfoCard label="Mailbox" value={microsoft.email || currentUser.email} /><InfoCard label="Calendar" value="Read + create events" /><InfoCard label="Mail" value="Send from your mailbox" /></div>}
              <div className="mt-5 flex flex-wrap gap-3">
                {!microsoft?.connected ? <button disabled={busy || !microsoft?.configured} onClick={connectMicrosoft} className="inline-flex items-center gap-2 rounded-lg bg-[#b1191f] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Link2 className="h-4 w-4" />Connect Microsoft 365</button> : <button disabled={busy} onClick={disconnectMicrosoft} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><Unplug className="h-4 w-4" />Disconnect</button>}
                <button disabled={busy} onClick={loadMicrosoftStatus} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Refresh status</button>
              </div>
              {!microsoft?.configured && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">A Super Admin must finish the Microsoft Entra/Vercel configuration before staff can connect. No Microsoft secret is stored in the browser.</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Capability icon={CalendarDays} title="Outlook calendar" text="Publish SPIP meetings and read your upcoming SCM calendar events." /><Capability icon={Mail} title="Outlook mail" text="Send approved prospect/client emails from your own SCM corporate mailbox." /></div>
          </div>}

          {activeSection === 'preferences' && <div className="space-y-6"><Heading title="Workspace Preferences" text="SPIP uses a compact, responsive workspace designed for desktop and mobile use." /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><InfoCard label="Interface" value="SCM Corporate" /><InfoCard label="Default workspace" value="Asset Management" /><InfoCard label="Currency" value="Nigerian Naira (₦)" /><InfoCard label="Time zone" value="West Africa Time" /></div></div>}

          {activeSection === 'administration' && isAdmin && <div className="space-y-6"><Heading title="Administration" text="High-level platform configuration. Secret values remain server-side in Vercel and are never displayed here." /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><StatusCard title="Authentication" detail="Supabase Auth" /><StatusCard title="Database" detail="Supabase PostgreSQL" /><StatusCard title="Prospect intelligence" detail="Apollo API" /><StatusCard title="Microsoft 365" detail={microsoft?.configured ? 'Entra + Microsoft Graph configured' : 'Configuration pending'} /><StatusCard title="Hosting" detail="Vercel" /></div><div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><MonitorCog className="mt-0.5 h-5 w-5 shrink-0" /><span>Microsoft client secrets, refresh tokens and token-encryption material stay server-side. Staff see only connection status and approved actions.</span></div></div>}
        </section>
      </div>
    </div>
  );
};

const Heading = ({ title, text }: { title: string; text: string }) => <div><h2 className="text-lg font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
const InfoCard = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div><div className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</div></div>;
const StatusCard = ({ title, detail }: { title: string; detail: string }) => <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" />{title}</div><div className="mt-2 text-sm text-slate-500">{detail}</div></div>;
const Capability = ({ icon: Icon, title, text }: { icon: any; title: string; text: string }) => <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 font-semibold text-slate-900"><Icon className="h-4 w-4 text-[#b1191f]" />{title}</div><p className="mt-2 text-sm text-slate-500">{text}</p></div>;