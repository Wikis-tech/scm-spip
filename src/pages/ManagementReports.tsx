import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileSpreadsheet,
  RefreshCw,
  Target,
  TrendingUp,
  Users2,
} from 'lucide-react';
import type { UserProfile } from '../types';
import { ManagementRecharts } from '../components/analytics/BusinessCharts';
import { supabase } from '../lib/supabase';

interface ManagementReportsProps {
  currentUser: UserProfile;
}

type Tab = 'weekly' | 'monthly' | 'staff';

interface WeeklyRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  prospects_added: number;
  meetings_held: number;
  follow_ups_completed: number;
  funds_secured: number;
}

interface MonthlyResponse {
  month: string;
  period: { startDate: string; endDate: string };
  summary: {
    prospectsAdded: number;
    meetingsHeld: number;
    activitiesLogged: number;
    followUpsCompleted: number;
    conversions: number;
    pipelineValueAdded: number;
    realizedRevenue: number;
    fundsSecuredReported: number;
    weeklyReportsSubmitted: number;
    weeklyReportsReviewed: number;
  };
}

interface StaffPerformanceResponse {
  period: { startDate: string; endDate: string };
  staff: Array<{
    userId: string;
    fullName: string;
    email: string;
    department: string;
    permissionLevel: string;
    prospectsAdded: number;
    meetingsHeld: number;
    activitiesLogged: number;
    tasksCompleted: number;
    tasksDue: number;
    taskCompletionRate: number;
    wonProspects: number;
    pipelineValue: number;
    realizedRevenue: number;
    weeklyReportsSubmitted: number;
    weeklyReportsReviewed: number;
    reportCompliance: number;
  }>;
}

const money = (value: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const monthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const ManagementReports: React.FC<ManagementReportsProps> = ({ currentUser }) => {
  const [tab, setTab] = useState<Tab>('weekly');
  const [month, setMonth] = useState(monthKey());
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyResponse | null>(null);
  const [staff, setStaff] = useState<StaffPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticatedFetch = async (url: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Your secure session has expired. Sign in again.');
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  };

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const [weeklyRes, monthlyRes, staffRes] = await Promise.all([
        authenticatedFetch(`/api/admin/reports/overview?month=${encodeURIComponent(month)}`),
        authenticatedFetch(`/api/admin/reports/monthly?month=${encodeURIComponent(month)}`),
        authenticatedFetch(`/api/admin/staff/performance?month=${encodeURIComponent(month)}`),
      ]);

      const weeklyPayload = await weeklyRes.json().catch(() => ({}));
      const monthlyPayload = await monthlyRes.json().catch(() => ({}));
      const staffPayload = await staffRes.json().catch(() => ({}));

      if (!weeklyRes.ok) throw new Error(weeklyPayload?.error || 'Unable to load weekly reports.');
      if (!monthlyRes.ok) throw new Error(monthlyPayload?.error || 'Unable to load monthly report.');
      if (!staffRes.ok) throw new Error(staffPayload?.error || 'Unable to load staff performance.');

      setWeekly(Array.isArray(weeklyPayload?.reports) ? weeklyPayload.reports : []);
      setMonthly(monthlyPayload);
      setStaff(staffPayload);
    } catch (err: any) {
      setError(err?.message || 'Unable to load management reporting data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [month, currentUser.id]);

  const cards = useMemo(() => {
    if (!monthly) return [];
    const s = monthly.summary;
    return [
      { label: 'Prospects added', value: s.prospectsAdded.toLocaleString(), icon: Target },
      { label: 'Meetings held', value: s.meetingsHeld.toLocaleString(), icon: CalendarDays },
      { label: 'Follow-ups', value: s.followUpsCompleted.toLocaleString(), icon: ClipboardCheck },
      { label: 'Conversions', value: s.conversions.toLocaleString(), icon: TrendingUp },
    ];
  }, [monthly]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Administration</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Management Reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Weekly reporting, monthly performance and team activity in one concise workspace.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400" />
          <button onClick={loadReports} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </section>

      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        <TabButton active={tab === 'weekly'} onClick={() => setTab('weekly')} icon={FileSpreadsheet} label="Weekly" />
        <TabButton active={tab === 'monthly'} onClick={() => setTab('monthly')} icon={BarChart3} label="Monthly" />
        <TabButton active={tab === 'staff'} onClick={() => setTab('staff')} icon={Users2} label="Team" />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading && !monthly ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400"><RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading reports…</div> : null}

      {tab === 'weekly' && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-950">Weekly submissions</h2><p className="mt-1 text-xs text-slate-400">Submitted and reviewed reports for the selected month</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-5 py-3">Officer</th><th className="px-5 py-3">Week</th><th className="px-5 py-3">Prospects</th><th className="px-5 py-3">Meetings</th><th className="px-5 py-3">Follow-ups</th><th className="px-5 py-3">Funds secured</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {weekly.map((row) => <tr key={row.id} className="text-slate-600"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{row.user_name}</div><div className="text-xs text-slate-400">{row.user_email}</div></td><td className="px-5 py-4">{row.week_start_date} → {row.week_end_date}</td><td className="px-5 py-4">{row.prospects_added || 0}</td><td className="px-5 py-4">{row.meetings_held || 0}</td><td className="px-5 py-4">{row.follow_ups_completed || 0}</td><td className="px-5 py-4 font-semibold">{money(row.funds_secured || 0)}</td><td className="px-5 py-4"><Status status={row.status} /></td></tr>)}
                {weekly.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No weekly reports for this month.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'monthly' && monthly && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon }) => <Kpi key={label} label={label} value={value} icon={Icon} />)}
          </div>
          <ManagementRecharts monthly={monthly} staff={staff} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Kpi label="Pipeline added" value={money(monthly.summary.pipelineValueAdded)} icon={BarChart3} />
            <Kpi label="Realized revenue" value={money(monthly.summary.realizedRevenue)} icon={CircleDollarSign} />
            <Kpi label="Funds reported" value={money(monthly.summary.fundsSecuredReported)} icon={Activity} />
          </div>
        </div>
      )}

      {tab === 'staff' && staff && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-slate-950">Team performance</h2><p className="mt-1 text-xs text-slate-400">Operational activity for the selected month</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-400"><tr><th className="px-5 py-3">Staff</th><th className="px-5 py-3">Prospects</th><th className="px-5 py-3">Meetings</th><th className="px-5 py-3">Activities</th><th className="px-5 py-3">Conversions</th><th className="px-5 py-3">Pipeline</th><th className="px-5 py-3">Revenue</th><th className="px-5 py-3">Report compliance</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {staff.staff.map((row) => <tr key={row.userId} className="text-slate-600"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{row.fullName}</div><div className="text-xs text-slate-400">{row.email}</div></td><td className="px-5 py-4">{row.prospectsAdded}</td><td className="px-5 py-4">{row.meetingsHeld}</td><td className="px-5 py-4">{row.activitiesLogged}</td><td className="px-5 py-4">{row.wonProspects}</td><td className="px-5 py-4 font-semibold">{money(row.pipelineValue)}</td><td className="px-5 py-4 font-semibold">{money(row.realizedRevenue)}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{row.reportCompliance}%</span></td></tr>)}
                {staff.staff.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">No active staff performance data for this month.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) => <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}><Icon className="h-4 w-4" />{label}</button>;

const Kpi = ({ label, value, icon: Icon }: { label: string; value: string; icon: any }) => <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div><div className="mt-2 break-words text-xl font-bold text-slate-950">{value}</div></div><div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div></div></div>;

const Status = ({ status }: { status: string }) => <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${String(status).toLowerCase() === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : String(status).toLowerCase() === 'submitted' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{status}</span>;
