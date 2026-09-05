import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  LockKeyhole,
  MonitorCog,
  ImageIcon,
  Upload,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { UserProfile } from '../types';
import { registerServiceWorkerAndSubscribe, isPushSupported } from '../services/pushService';
import { supabase } from '../lib/supabase';
import { getSpipBranding, refreshSpipBranding } from '../lib/branding';

interface SettingsProps {
  currentUser: UserProfile;
}

type SectionKey = 'profile' | 'security' | 'notifications' | 'preferences' | 'administration';

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const isAdmin = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [message, setMessage] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'logo' | 'favicon' | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  React.useEffect(() => {
    if (isAdmin) getSpipBranding().then((branding) => {
      setLogoUrl(branding.logoUrl);
      setFaviconUrl(branding.faviconUrl);
    });
  }, [isAdmin]);

  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage('Upload the official SCM logo as a PNG, JPEG or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage('The logo must be 2 MB or smaller.');
      return;
    }
    setUploadTarget('logo');
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30_000);
      const response = await fetch('/api/admin/branding/logo', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to upload the logo.');
      setLogoUrl(payload.logoUrl);
      refreshSpipBranding();
      setMessage('The official SCM logo has been updated across SPIP.');
    } catch (error: any) {
      setMessage(error?.name === 'AbortError'
        ? 'The logo upload timed out. Please check your connection and try again.'
        : error?.message || 'Unable to upload the logo right now.');
    } finally {
      setUploadTarget(null);
    }
  };

  const uploadFavicon = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    if (file.type !== 'image/png') {
      setMessage('Upload the browser favicon as a PNG image.');
      return;
    }
    if (file.size > 512 * 1024) {
      setMessage('The favicon must be 512 KB or smaller.');
      return;
    }
    setUploadTarget('favicon');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch('/api/admin/branding/favicon', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to upload the favicon.');
      setFaviconUrl(payload.faviconUrl);
      refreshSpipBranding();
      setMessage('The official SPIP favicon has been updated for everyone.');
    } catch (error: any) {
      setMessage(error?.name === 'AbortError'
        ? 'The favicon upload timed out. Please check your connection and try again.'
        : error?.message || 'Unable to upload the favicon right now.');
    } finally {
      window.clearTimeout(timeout);
      setUploadTarget(null);
    }
  };

  const sections = useMemo(() => {
    const rows: { key: SectionKey; label: string; description: string; icon: any; admin?: boolean }[] = [
      { key: 'profile', label: 'Profile', description: 'Your SCM identity and access level', icon: UserRound },
      { key: 'security', label: 'Password & Security', description: 'Password recovery and session security', icon: LockKeyhole },
      { key: 'notifications', label: 'Notifications', description: 'Browser and meeting reminder preferences', icon: Bell },
      { key: 'preferences', label: 'Preferences', description: 'Workspace display and behaviour', icon: Settings2 },
    ];
    if (isAdmin) {
      rows.push({ key: 'administration', label: 'Administration', description: 'Platform access and integration overview', icon: ShieldCheck, admin: true });
    }
    return rows;
  }, [isAdmin]);

  const sendPasswordReset = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage('A secure password reset link has been sent to your SCM corporate email.');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to send the password reset email right now.');
    } finally {
      setBusy(false);
    }
  };

  const enableNotifications = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!isPushSupported()) {
        setMessage('Push notifications are not supported in this browser.');
        return;
      }
      const success = await registerServiceWorkerAndSubscribe(currentUser.id, currentUser.email, currentUser.role);
      setMessage(success ? 'Notifications are enabled for this device.' : 'Notification setup was not completed. Check your browser permission and try again.');
    } catch (error: any) {
      setMessage(error?.message || 'Unable to enable notifications right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Workspace settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage your account, security and device preferences without exposing technical system secrets.</p>
      </div>

      {message && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {sections.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => {
                  setActiveSection(section.key);
                  setMessage('');
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
              >
                <span className={`rounded-lg p-2 ${active ? 'bg-white/10' : 'bg-slate-100'}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{section.label}</span>
                  <span className={`mt-0.5 block text-[11px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{section.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>
            );
          })}
        </aside>

        <section className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Profile</h2>
                <p className="mt-1 text-sm text-slate-500">Your identity is managed through SCM Capital's approved SPIP directory.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard label="Full name" value={currentUser.fullName} />
                <InfoCard label="Corporate email" value={currentUser.email} />
                <InfoCard label="Department" value={currentUser.department || 'Asset Management'} />
                <InfoCard label="Access level" value={currentUser.permissionLevel === 'SUPER_ADMIN' ? 'Super Admin' : currentUser.permissionLevel === 'HOD_ADMIN' ? 'HOD Admin' : 'Staff'} />
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Password & Security</h2>
                <p className="mt-1 text-sm text-slate-500">Authentication is handled by Supabase Auth. SPIP never stores your password in the CRM database.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 text-[#b1191f]" />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">Reset password</div>
                    <p className="mt-1 text-sm text-slate-500">Send a secure recovery link to {currentUser.email}.</p>
                    <button disabled={busy} onClick={sendPasswordReset} className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">Send reset link</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Notifications</h2>
                <p className="mt-1 text-sm text-slate-500">Enable browser notifications for meeting, task and follow-up reminders on this device.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">Browser notifications</div>
                    <p className="mt-1 text-sm text-slate-500">Current permission: <span className="font-medium text-slate-700">{typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'}</span></p>
                  </div>
                  <button disabled={busy} onClick={enableNotifications} className="rounded-lg bg-[#b1191f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#94151a] disabled:opacity-50">Enable notifications</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Workspace Preferences</h2>
                <p className="mt-1 text-sm text-slate-500">SPIP uses a compact, responsive workspace designed for desktop and mobile use.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoCard label="Interface" value="SCM Corporate" />
                <InfoCard label="Default workspace" value="Asset Management" />
                <InfoCard label="Currency" value="Nigerian Naira (₦)" />
                <InfoCard label="Time zone" value="West Africa Time" />
              </div>
            </div>
          )}

          {activeSection === 'administration' && isAdmin && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Administration</h2>
                <p className="mt-1 text-sm text-slate-500">High-level platform configuration. Secret values remain server-side in Vercel and are never displayed here.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatusCard title="Authentication" detail="Supabase Auth" />
                <StatusCard title="Database" detail="Supabase PostgreSQL" />
                <StatusCard title="Prospect intelligence" detail="Apollo API" />
                <StatusCard title="Hosting" detail="Vercel" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                      {logoUrl ? <img src={logoUrl} alt="Current SCM logo" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-slate-300" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Official SCM logo</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Upload the approved transparent PNG, JPEG or WebP. Maximum size: 2 MB.</p>
                    </div>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#b1191f] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#94151a]">
                    <Upload className="h-4 w-4" />
                    {uploadTarget === 'logo' ? 'Uploading…' : 'Upload logo'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadTarget !== null} onChange={uploadLogo} />
                  </label>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                      {faviconUrl ? <img src={faviconUrl} alt="Current SPIP favicon" className="h-10 w-10 object-contain" /> : <ImageIcon className="h-6 w-6 text-slate-300" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Official favicon</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Upload a square PNG for browser tabs and bookmarks. Recommended: 512 × 512 px. Maximum size: 512 KB.</p>
                    </div>
                  </div>
                  <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800">
                    <Upload className="h-4 w-4" />
                    {uploadTarget === 'favicon' ? 'Uploading…' : 'Upload favicon'}
                    <input type="file" accept="image/png" className="sr-only" disabled={uploadTarget !== null} onChange={uploadFavicon} />
                  </label>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <MonitorCog className="mt-0.5 h-5 w-5 shrink-0" />
                <span>Integration secrets and system-level changes should be managed only from the secured deployment environment and Super Admin workflow.</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
    <div className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

const StatusCard = ({ title, detail }: { title: string; detail: string }) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" />{title}</div>
    <div className="mt-2 text-sm text-slate-500">{detail}</div>
  </div>
);
