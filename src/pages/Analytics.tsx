import React, { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownToLine, BarChart3, BriefcaseBusiness,
  CalendarDays, CheckCircle2, CircleDollarSign, Clock3, RefreshCw, Target, Users2,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { UserProfile } from '../types';

const COLORS = ['#8c1018', '#b1191f', '#0f766e', '#2563eb', '#b45309', '#7c3aed', '#475569', '#94a3b8'];
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const shortMoney = (value: unknown) => {
  const amount = Number(value || 0);
  if (amount >= 1e9) return `₦${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `₦${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `₦${(amount / 1e3).toFixed(0)}K`;
  return `₦${amount.toLocaleString('en-NG')}`;
};

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">{children}</div>
);

export const Analytics: React.FC<{ currentUser: UserProfile; scmFetch: (url: string, options?: RequestInit) => Promise<Response> }> = ({ currentUser, scmFetch }) => {
  const isAdmin = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';
  const [range, setRange] = useState('90');
  const [officer, setOfficer] = useState('all');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ range });
      if (isAdmin) params.set('officer', officer);
      const response = await scmFetch(`/api/analytics/overview?${params}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to load analytics.');
      setData(payload);
    } catch (err: any) {
      setError(err?.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [range, officer, scmFetch]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['SCM SPIP Analytics', 'Value'],
      ['Period', `${data.meta.startDate} to ${data.meta.endDate}`],
      ['Scope', data.meta.scope],
      ['Total prospects', data.kpis.totalProspects],
      ['New prospects', data.kpis.newProspects],
      ['Open opportunities', data.kpis.openOpportunities],
      ['Pipeline value', data.kpis.pipelineValue],
      ['Weighted pipeline', data.kpis.weightedPipeline],
      ['Conversion rate (%)', data.kpis.conversionRate],
      ['Current AUM', data.kpis.currentAum],
      ['Activities', data.kpis.activities],
      ['Meetings', data.kpis.meetings],
      ['Task completion rate (%)', data.kpis.taskCompletionRate],
      ['Overdue tasks', data.kpis.overdueTasks],
      ['Stale prospects', data.kpis.staleProspects],
      [],
      ['Monthly trend', 'New prospects', 'Pipeline added', 'Conversions', 'AUM added', 'Activities', 'Meetings'],
      ...data.trend.map((row: any) => [row.month, row.newProspects, row.pipelineAdded, row.conversions, row.aumAdded, row.activities, row.meetings]),
    ];
    const csv = rows.map((row: any[]) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `SCM_SPIP_Analytics_${data.meta.endDate}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const k = data?.kpis || {};
  const actionRows = [...(data?.actionQueue?.overdueTasks || []), ...(data?.actionQueue?.staleProspects || [])];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 bg-gradient-to-r from-slate-950 via-[#171c2a] to-[#671018] px-5 py-6 text-white md:px-7 lg:flex-row lg:items-center">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-200">Phase 8 • Decision intelligence</div>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">Performance Analytics</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">Live, permission-scoped KPIs for pipeline health, conversion, funded AUM, activity and follow-up risk.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/15 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
            <button onClick={exportCsv} disabled={!data} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" />Export CSV</button>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <label className="text-xs font-bold text-slate-600">Reporting period
            <select value={range} onChange={(event) => setRange(event.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
              <option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="180">Last 180 days</option><option value="365">Last 12 months</option><option value="all">All time</option>
            </select>
          </label>
          {isAdmin ? <label className="text-xs font-bold text-slate-600">Officer
            <select value={officer} onChange={(event) => setOfficer(event.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
              <option value="all">Whole team</option>{(data?.filters?.officers || []).map((row: any) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label> : <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">Private view: your assigned records only</span>}
          {data?.meta?.generatedAt ? <span className="sm:ml-auto text-[10px] text-slate-400">Updated {new Date(data.meta.generatedAt).toLocaleString('en-NG')}</span> : null}
        </div>
      </section>

      {error ? <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><span>{error}</span><button onClick={load} className="underline">Retry</button></div> : null}
      {loading && !data ? <div className="flex min-h-[420px] items-center justify-center text-sm font-semibold text-slate-500"><RefreshCw className="mr-2 h-5 w-5 animate-spin text-[#8c1018]" />Calculating secure analytics…</div> : null}

      {data ? <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
          {[
            ['Open opportunities', k.openOpportunities, `${k.newProspects} new in period`, BriefcaseBusiness],
            ['Pipeline value', shortMoney(k.pipelineValue), 'Open, unweighted', CircleDollarSign],
            ['Weighted pipeline', shortMoney(k.weightedPipeline), 'Probability adjusted', Target],
            ['Current AUM', shortMoney(k.currentAum), `${k.periodConversions} conversions in period`, CheckCircle2],
            ['Conversion rate', `${k.conversionRate}%`, `${k.wonProspects} converted / ${k.totalProspects} total`, BarChart3],
            ['Follow-up risk', k.overdueTasks + k.staleProspects, `${k.overdueTasks} overdue • ${k.staleProspects} stale`, AlertTriangle],
          ].map(([label, value, helper, Icon]: any) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span><Icon className="h-4 w-4 text-[#8c1018]" /></div><div className="mt-2 text-xl font-black text-slate-950">{value}</div><div className="mt-1 text-[10px] text-slate-500">{helper}</div></section>)}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className={`${card} xl:col-span-2`}><div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Movement</div><h2 className="mt-1 text-base font-black text-slate-900">Pipeline and funded AUM trend</h2></div>
            {data.trend.some((row: any) => row.pipelineAdded || row.aumAdded) ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tickFormatter={shortMoney} tick={{ fontSize: 10 }} /><Tooltip formatter={(value: any) => shortMoney(value)} /><Legend /><Line type="monotone" dataKey="pipelineAdded" name="Pipeline added" stroke="#475569" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="aumAdded" name="AUM added" stroke="#8c1018" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div> : <Empty>No pipeline or conversion values were recorded in this period.</Empty>}
          </section>
          <section className={card}><div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Funnel</div><h2 className="mt-1 text-base font-black text-slate-900">Prospects by relationship stage</h2></div>
            {data.stages.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.stages} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="stage" width={105} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" name="Prospects" fill="#8c1018" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div> : <Empty>No prospects are available in this scope.</Empty>}
          </section>
          <section className={card}><div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Portfolio mix</div><h2 className="mt-1 text-base font-black text-slate-900">Pipeline value by industry</h2></div>
            {data.industries.some((row: any) => row.value) ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.industries} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2}>{data.industries.map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value: any) => shortMoney(value)} /><Legend /></PieChart></ResponsiveContainer></div> : <Empty>Add opportunity values to see the industry mix.</Empty>}
          </section>
          <section className={card}><div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Execution</div><h2 className="mt-1 text-base font-black text-slate-900">Prospecting activity by month</h2></div>
            {data.trend.some((row: any) => row.activities || row.meetings) ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="activities" fill="#475569" radius={[4,4,0,0]} /><Bar dataKey="meetings" fill="#0f766e" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div> : <Empty>No activity or meetings were recorded in this period.</Empty>}
          </section>
          <section className={card}><div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Client book</div><h2 className="mt-1 text-base font-black text-slate-900">Funded AUM by product</h2></div>
            {data.products.some((row: any) => row.aum) ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.products}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tickFormatter={shortMoney} tick={{ fontSize: 10 }} /><Tooltip formatter={(value: any) => shortMoney(value)} /><Bar dataKey="aum" name="Current AUM" fill="#8c1018" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div> : <Empty>Record Client 360 conversions to see product AUM.</Empty>}
          </section>
        </div>

        {isAdmin && officer === 'all' ? <section className={card}><div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Management view</div><h2 className="mt-1 text-base font-black text-slate-900">Officer performance</h2></div><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-xs"><thead><tr className="border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-400"><th className="p-3">Officer</th><th className="p-3 text-right">Prospects</th><th className="p-3 text-right">Weighted pipeline</th><th className="p-3 text-right">Current AUM</th><th className="p-3 text-right">Activities</th><th className="p-3 text-right">Meetings</th><th className="p-3 text-right">Overdue</th></tr></thead><tbody className="divide-y divide-slate-100">{data.officers.map((row: any) => <tr key={row.userId} className="hover:bg-slate-50"><td className="p-3 font-bold text-slate-900">{row.name}</td><td className="p-3 text-right">{row.prospects}</td><td className="p-3 text-right font-semibold">{shortMoney(row.weightedPipeline)}</td><td className="p-3 text-right font-semibold text-emerald-700">{shortMoney(row.currentAum)}</td><td className="p-3 text-right">{row.activities}</td><td className="p-3 text-right">{row.meetings}</td><td className="p-3 text-right text-red-700">{row.overdueTasks}</td></tr>)}</tbody></table></div></section> : null}

        <section className={card}><div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Action queue</div><h2 className="mt-1 text-base font-black text-slate-900">Items requiring attention</h2></div><div className="flex gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" />Task completion {k.taskCompletionRate}%</span><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{k.meetings} meetings</span></div></div>
          {actionRows.length ? <div className="divide-y divide-slate-100">{actionRows.map((row: any) => <div key={`${row.type}-${row.id}`} className="grid gap-2 py-3 text-xs sm:grid-cols-[140px_minmax(0,1fr)_130px_90px] sm:items-center"><span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${row.type === 'Overdue task' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{row.type}</span><div><div className="font-bold text-slate-900">{row.company}</div><div className="mt-0.5 text-slate-500">{row.detail}</div></div><span className="flex items-center gap-1 text-slate-500"><Clock3 className="h-3.5 w-3.5" />{row.dueDate || 'No date'}</span><span className="text-right font-bold text-slate-600">{row.priority}</span></div>)}</div> : <div className="flex items-center justify-center gap-2 py-10 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5" />No overdue tasks or stale prospects in this scope.</div>}
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] leading-5 text-blue-900"><strong>Metric definitions:</strong> Pipeline value includes open opportunities only. Weighted pipeline applies each recorded conversion probability. Conversion rate uses converted/won prospects divided by all prospects in scope. Current AUM comes from recorded Client 360 conversions.</section>
      </> : null}
    </div>
  );
};
