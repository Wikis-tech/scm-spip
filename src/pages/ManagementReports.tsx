import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, FileSpreadsheet, RefreshCw, Users, TrendingUp, Target, CircleDollarSign, ClipboardCheck, Activity } from 'lucide-react';
import type { UserProfile } from '../types';
import { AdminReports } from './AdminReports';
import { ManagementRecharts } from '../components/analytics/BusinessCharts';

interface ManagementReportsProps {
  currentUser: UserProfile;
}

type Tab = 'weekly' | 'monthly' | 'staff';

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
  const [monthly, setMonthly] = useState<MonthlyResponse | null>(null);
  const [staff, setStaff] = useState<StaffPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhase2Reports = async () => {
    setLoading(true);
    setError(null);
    try {
      const [monthlyRes, staffRes] = await Promise.all([
        fetch(`/api/admin/reports/monthly?month=${encodeURIComponent(month)}`),
        fetch(`/api/admin/staff/performance?month=${encodeURIComponent(month)}`),
      ]);

      const monthlyPayload = await monthlyRes.json().catch(() => ({}));
      const staffPayload = await staffRes.json().catch(() => ({}));

      if (!monthlyRes.ok) throw new Error(monthlyPayload.error || 'Unable to load monthly management report.');
      if (!staffRes.ok) throw new Error(staffPayload.error || 'Unable to load staff performance report.');

      setMonthly(monthlyPayload);
      setStaff(staffPayload);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Phase 2 reporting data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'weekly') loadPhase2Reports();
  }, [month, tab]);

  const cards = useMemo(() => {
    if (!monthly) return [];
    const s = monthly.summary;
    return [
      { label: 'Prospects Added', value: s.prospectsAdded.toLocaleString(), icon: Target },
      { label: 'Meetings Held', value: s.meetingsHeld.toLocaleString(), icon: CalendarDays },
      { label: 'Follow-ups Completed', value: s.followUpsCompleted.toLocaleString(), icon: ClipboardCheck },
      { label: 'Conversions', value: s.conversions.toLocaleString(), icon: TrendingUp },
      { label: 'Pipeline Added', value: money(s.pipelineValueAdded), icon: BarChart3 },
      { label: 'Realized Revenue', value: money(s.realizedRevenue), icon: CircleDollarSign },
      { label: 'Funds Reported', value: money(s.fundsSecuredReported), icon: CircleDollarSign },
      { label: 'Activities Logged', value: s.activitiesLogged.toLocaleString(), icon: Activity },
    ];
  }, [monthly]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 md:px-7 py-6 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-[#651018] text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">SCM CAPITAL • MANAGEMENT</div>
              <h1 className="text-2xl md:text-3xl font-black mt-2">Management Reporting Center</h1>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl">Weekly governance, monthly management summaries and staff performance oversight in one permission-controlled workspace.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 p-1.5">
              {([
                ['weekly', 'Weekly Reports', FileSpreadsheet],
                ['monthly', 'Monthly Summary', BarChart3],
                ['staff', 'Staff Performance', Users],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-200 hover:bg-white/10'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tab === 'weekly' ? (
        <AdminReports currentUser={currentUser} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reporting Period</div>
              <div className="text-sm font-bold text-slate-700 mt-1">Select the management month to analyze.</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#8c1018]"
              />
              <button onClick={loadPhase2Reports} className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-bold flex items-center gap-2 hover:bg-slate-800">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          {(monthly || staff) && <ManagementRecharts monthly={monthly} staff={staff} />}

          {tab === 'monthly' && monthly && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {cards.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                      <Icon className="w-4 h-4 text-[#8c1018]" />
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-900 break-words">{value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weekly Reporting Governance</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{monthly.summary.weeklyReportsSubmitted} submitted • {monthly.summary.weeklyReportsReviewed} reviewed</div>
                </div>
                <div className="text-xs font-semibold text-slate-500">{monthly.period.startDate} → {monthly.period.endDate}</div>
              </div>
            </div>
          )}

          {tab === 'staff' && staff && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3">Prospects</th>
                      <th className="px-4 py-3">Meetings</th>
                      <th className="px-4 py-3">Activities</th>
                      <th className="px-4 py-3">Tasks</th>
                      <th className="px-4 py-3">Conversions</th>
                      <th className="px-4 py-3">Pipeline</th>
                      <th className="px-4 py-3">Revenue</th>
                      <th className="px-4 py-3">Report Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.staff.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-900">{row.fullName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{row.department} • {row.email}</div>
                        </td>
                        <td className="px-4 py-4 font-bold">{row.prospectsAdded}</td>
                        <td className="px-4 py-4 font-bold">{row.meetingsHeld}</td>
                        <td className="px-4 py-4 font-bold">{row.activitiesLogged}</td>
                        <td className="px-4 py-4"><span className="font-bold">{row.tasksCompleted}/{row.tasksDue}</span><div className="text-[10px] text-slate-400">{row.taskCompletionRate}% complete</div></td>
                        <td className="px-4 py-4 font-bold">{row.wonProspects}</td>
                        <td className="px-4 py-4 font-bold">{money(row.pipelineValue)}</td>
                        <td className="px-4 py-4 font-bold">{money(row.realizedRevenue)}</td>
                        <td className="px-4 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{row.reportCompliance}%</span></td>
                      </tr>
                    ))}
                    {staff.staff.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">No active staff profiles were found for this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
