import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
  Users2,
  XCircle,
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface AuditLog {
  id: string;
  timestamp: string;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  target?: string | null;
  status: string;
}

interface AdminDashboardProps {
  currentUser: UserProfile;
  initialSubTab?: 'users' | 'approvals' | 'audit' | 'system' | 'search-analytics';
  onNavigate?: (tab: string) => void;
}

type AdminTab = 'users' | 'approvals' | 'audit';

const normalizedStatus = (user: any) => String(user.accountStatus || user.status || '').toUpperCase();

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, initialSubTab = 'users' }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<AdminTab>(initialSubTab === 'approvals' ? 'approvals' : initialSubTab === 'audit' ? 'audit' : 'users');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const isSuperAdmin = currentUser.permissionLevel === 'SUPER_ADMIN';

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  const load = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [userResponse, auditResponse] = await Promise.all([
        authenticatedFetch('/api/admin/users'),
        authenticatedFetch('/api/admin/audit-logs'),
      ]);

      const userPayload = await userResponse.json().catch(() => []);
      const auditPayload = await auditResponse.json().catch(() => []);

      if (!userResponse.ok) throw new Error(userPayload?.error || 'Unable to load users and access.');
      setUsers(Array.isArray(userPayload) ? userPayload : []);
      setAuditLogs(auditResponse.ok && Array.isArray(auditPayload) ? auditPayload : []);
    } catch (error: any) {
      setFeedback({ tone: 'error', text: error?.message || 'Unable to load administration data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentUser.id]);

  useEffect(() => {
    if (initialSubTab === 'approvals') setTab('approvals');
    else if (initialSubTab === 'audit') setTab('audit');
  }, [initialSubTab]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = tab === 'approvals' ? users.filter((user) => normalizedStatus(user) === 'PENDING') : users;
    if (!query) return source;
    return source.filter((user) => [user.fullName, user.email, user.department, user.jobTitle, user.permissionLevel].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [users, search, tab]);

  const pendingCount = users.filter((user) => normalizedStatus(user) === 'PENDING').length;
  const activeCount = users.filter((user) => ['ACTIVE', 'APPROVED'].includes(normalizedStatus(user))).length;
  const staffCount = users.filter((user) => user.permissionLevel === 'STAFF').length;

  const updateUser = async (user: any, patch: any, success: string) => {
    setBusyUser(user.id);
    setFeedback(null);
    try {
      const response = await authenticatedFetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to update this account.');
      setFeedback({ tone: 'success', text: success });
      await load();
    } catch (error: any) {
      setFeedback({ tone: 'error', text: error?.message || 'Unable to update this account.' });
    } finally {
      setBusyUser(null);
    }
  };

  const changePermission = async (user: any, permissionLevel: string) => {
    await updateUser(user, { permissionLevel }, `${user.fullName}'s access level was updated.`);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Administration</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Users & Access</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Approve staff access, manage account status and review security-sensitive changes.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </section>

      {feedback && <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{feedback.text}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Active accounts" value={activeCount} icon={UserCheck} />
        <Metric label="Pending approval" value={pendingCount} icon={Clock3} attention={pendingCount > 0} />
        <Metric label="Staff accounts" value={staffCount} icon={Users2} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <TabButton label="Directory" active={tab === 'users'} onClick={() => setTab('users')} />
            <TabButton label={`Pending${pendingCount ? ` (${pendingCount})` : ''}`} active={tab === 'approvals'} onClick={() => setTab('approvals')} />
            <TabButton label="Audit" active={tab === 'audit'} onClick={() => setTab('audit')} />
          </div>
          {tab !== 'audit' && (
            <label className="relative block w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or department" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
            </label>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-slate-400"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading directory…</div>
        ) : tab === 'audit' ? (
          <AuditTable logs={auditLogs} />
        ) : (
          <UserTable
            rows={filteredUsers}
            isSuperAdmin={isSuperAdmin}
            busyUser={busyUser}
            onUpdate={updateUser}
            onPermission={changePermission}
          />
        )}
      </section>
    </div>
  );
};

const Metric = ({ label, value, icon: Icon, attention = false }: { label: string; value: number; icon: any; attention?: boolean }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div><div className="mt-2 text-2xl font-bold text-slate-950">{value}</div></div>
      <div className={`rounded-xl p-2.5 ${attention ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}><Icon className="h-5 w-5" /></div>
    </div>
  </div>
);

const TabButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
);

const UserTable = ({ rows, isSuperAdmin, busyUser, onUpdate, onPermission }: any) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-left">
      <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Access</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">No users match this view.</td></tr>}
        {rows.map((user: any) => {
          const status = normalizedStatus(user);
          const busy = busyUser === user.id;
          return (
            <tr key={user.id} className="text-sm">
              <td className="px-5 py-4"><div className="font-semibold text-slate-900">{user.fullName}</div><div className="mt-1 text-xs text-slate-400">{user.email}</div></td>
              <td className="px-5 py-4">
                {isSuperAdmin && user.permissionLevel !== 'SUPER_ADMIN' ? (
                  <select value={user.permissionLevel || 'STAFF'} onChange={(event) => onPermission(user, event.target.value)} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700">
                    <option value="STAFF">Staff</option><option value="HOD_ADMIN">HOD Admin</option>
                  </select>
                ) : <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{user.permissionLevel === 'SUPER_ADMIN' ? 'Super Admin' : user.permissionLevel === 'HOD_ADMIN' ? 'HOD Admin' : 'Staff'}</span>}
              </td>
              <td className="px-5 py-4 text-slate-500">{user.department || 'Asset Management'}</td>
              <td className="px-5 py-4"><StatusBadge status={status} /></td>
              <td className="px-5 py-4 text-right">
                {status === 'PENDING' ? (
                  <div className="inline-flex gap-2"><ActionButton disabled={busy} tone="success" label="Approve" onClick={() => onUpdate(user, { status: 'ACTIVE' }, `${user.fullName} was approved.`)} /><ActionButton disabled={busy} tone="danger" label="Reject" onClick={() => onUpdate(user, { status: 'REJECTED' }, `${user.fullName}'s request was rejected.`)} /></div>
                ) : status === 'ACTIVE' || status === 'APPROVED' ? (
                  user.permissionLevel === 'SUPER_ADMIN' ? <span className="text-xs text-slate-400">Protected</span> : <ActionButton disabled={busy} tone="neutral" label="Suspend" onClick={() => onUpdate(user, { status: 'SUSPENDED' }, `${user.fullName} was suspended.`)} />
                ) : (
                  <ActionButton disabled={busy} tone="success" label="Activate" onClick={() => onUpdate(user, { status: 'ACTIVE' }, `${user.fullName} was activated.`)} />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const AuditTable = ({ logs }: { logs: AuditLog[] }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-left">
      <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Target</th><th className="px-5 py-3">Result</th></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {logs.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">No audit events have been recorded yet.</td></tr>}
        {logs.slice(0, 100).map((log) => <tr key={log.id} className="text-sm text-slate-500"><td className="whitespace-nowrap px-5 py-4 text-xs">{log.timestamp ? new Date(log.timestamp).toLocaleString('en-NG') : '—'}</td><td className="px-5 py-4"><div className="font-medium text-slate-800">{log.userName || 'System'}</div><div className="text-xs text-slate-400">{log.userEmail || ''}</div></td><td className="px-5 py-4 font-medium text-slate-700">{log.action}</td><td className="px-5 py-4">{log.target || '—'}</td><td className="px-5 py-4"><StatusBadge status={log.status} /></td></tr>)}
      </tbody>
    </table>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const normalized = String(status || '').toUpperCase();
  const style = ['ACTIVE', 'APPROVED', 'SUCCESS'].includes(normalized) ? 'bg-emerald-50 text-emerald-700' : normalized === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${style}`}>{status || 'Unknown'}</span>;
};

const ActionButton = ({ label, onClick, tone, disabled }: { label: string; onClick: () => void; tone: 'success' | 'danger' | 'neutral'; disabled?: boolean }) => {
  const styles = tone === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : tone === 'danger' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200';
  return <button disabled={disabled} onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${styles}`}>{disabled ? 'Working…' : label}</button>;
};
