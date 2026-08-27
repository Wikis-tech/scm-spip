import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const PALETTE = ['#8c1018', '#b1191f', '#475569', '#0f766e', '#b45309', '#2563eb', '#7c3aed', '#64748b'];

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

const moneyShort = (value: number) => {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
};

const EmptyChart = ({ text }: { text: string }) => (
  <div className="h-64 flex items-center justify-center text-sm text-slate-400">{text}</div>
);

export function OfficerDashboardCharts({ prospects = [], activities = [], meetings = [], tasks = [] }: any) {
  const stageData = useMemo(() => {
    const counts = new Map<string, number>();
    prospects.forEach((p: any) => counts.set(String(p.status || 'Lead'), (counts.get(String(p.status || 'Lead')) || 0) + 1));
    return Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [prospects]);

  const activityData = useMemo(() => {
    const rows = new Map<string, { day: string; activities: number; meetings: number; tasks: number }>();
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      rows.set(key, { day: d.toLocaleDateString('en-NG', { weekday: 'short' }), activities: 0, meetings: 0, tasks: 0 });
    }
    activities.forEach((a: any) => {
      const key = String(a.date || a.createdAt || a.created_at || '').slice(0, 10);
      const row = rows.get(key); if (row) row.activities += 1;
    });
    meetings.forEach((m: any) => {
      const key = String(m.date || m.createdAt || m.created_at || '').slice(0, 10);
      const row = rows.get(key); if (row) row.meetings += 1;
    });
    tasks.forEach((t: any) => {
      const key = String(t.dueDate || t.due_date || '').slice(0, 10);
      const row = rows.get(key); if (row) row.tasks += 1;
    });
    return Array.from(rows.values());
  }, [activities, meetings, tasks]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section className={cardClass}>
        <div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pipeline Mix</div><h3 className="text-base font-black text-slate-900 mt-1">Prospects by stage</h3></div>
        {stageData.length === 0 ? <EmptyChart text="No prospects yet." /> : (
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stageData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={3}>{stageData.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></div>
        )}
      </section>
      <section className={cardClass}>
        <div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">7-day workflow</div><h3 className="text-base font-black text-slate-900 mt-1">Activity, meetings & tasks</h3></div>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={activityData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="activities" fill="#8c1018" radius={[4,4,0,0]} /><Bar dataKey="meetings" fill="#475569" radius={[4,4,0,0]} /><Bar dataKey="tasks" fill="#0f766e" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
      </section>
    </div>
  );
}

export function ExecutiveRecharts({ data }: { data: any }) {
  const leaderboard = (data?.leaderboard || []).slice(0, 8).map((row: any) => ({
    name: String(row.fullName || '').split(' ')[0] || 'Officer',
    secured: Number(row.amountSecured || 0),
    deals: Number(row.dealsClosed || 0),
  }));
  const products = (data?.products || []).slice(0, 8).map((row: any) => ({ name: row.productName || 'Other', value: Number(row.totalAmount || 0), count: Number(row.investmentsCount || 0) }));
  const reports = [...(data?.reports || [])].reverse().slice(-10).map((row: any) => ({
    date: String(row.weekEndDate || row.submissionDate || '').slice(5, 10),
    funds: Number(row.fundsSecured || 0),
    prospects: Number(row.prospectsAdded || 0),
    meetings: Number(row.meetingsHeld || 0),
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section className={cardClass}>
        <div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Team performance</div><h3 className="text-base font-black text-slate-900 mt-1">Funds secured by officer</h3></div>
        {leaderboard.length === 0 ? <EmptyChart text="No team conversion data yet." /> : <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={leaderboard} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(v) => moneyShort(Number(v))} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={74} tick={{ fontSize: 11 }} /><Tooltip formatter={(value: any) => moneyShort(Number(value))} /><Bar dataKey="secured" fill="#8c1018" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></div>}
      </section>
      <section className={cardClass}>
        <div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Product distribution</div><h3 className="text-base font-black text-slate-900 mt-1">Recorded funds by product</h3></div>
        {products.length === 0 ? <EmptyChart text="Product conversion data will appear here." /> : <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={products} dataKey="value" nameKey="name" innerRadius={56} outerRadius={92}>{products.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip formatter={(value: any) => moneyShort(Number(value))} /><Legend /></PieChart></ResponsiveContainer></div>}
      </section>
      <section className={`${cardClass} xl:col-span-2`}>
        <div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Reporting trend</div><h3 className="text-base font-black text-slate-900 mt-1">Weekly funds, prospects & meetings</h3></div>
        {reports.length === 0 ? <EmptyChart text="Submit weekly reports to build this trend." /> : <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={reports}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis yAxisId="left" tickFormatter={(v) => moneyShort(Number(v))} tick={{ fontSize: 10 }} /><YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Line yAxisId="left" type="monotone" dataKey="funds" stroke="#8c1018" strokeWidth={3} dot={false} /><Line yAxisId="right" type="monotone" dataKey="prospects" stroke="#2563eb" strokeWidth={2} /><Line yAxisId="right" type="monotone" dataKey="meetings" stroke="#0f766e" strokeWidth={2} /></LineChart></ResponsiveContainer></div>}
      </section>
    </div>
  );
}

export function ManagementRecharts({ monthly, staff }: { monthly?: any; staff?: any }) {
  const monthlyRows = monthly ? [
    { name: 'Prospects', value: monthly.summary?.prospectsAdded || 0 },
    { name: 'Meetings', value: monthly.summary?.meetingsHeld || 0 },
    { name: 'Activities', value: monthly.summary?.activitiesLogged || 0 },
    { name: 'Follow-ups', value: monthly.summary?.followUpsCompleted || 0 },
    { name: 'Conversions', value: monthly.summary?.conversions || 0 },
  ] : [];
  const staffRows = (staff?.staff || []).slice(0, 10).map((row: any) => ({
    name: String(row.fullName || '').split(' ')[0] || 'Staff',
    pipeline: Number(row.pipelineValue || 0),
    revenue: Number(row.realizedRevenue || 0),
    compliance: Number(row.reportCompliance || 0),
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section className={cardClass}>
        <div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Monthly operating volume</div><h3 className="text-base font-black text-slate-900 mt-1">Activity funnel</h3></div>
        {monthlyRows.length === 0 ? <EmptyChart text="Select a reporting month." /> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyRows}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#8c1018" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>}
      </section>
      <section className={cardClass}>
        <div className="mb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Staff pipeline</div><h3 className="text-base font-black text-slate-900 mt-1">Pipeline vs realized revenue</h3></div>
        {staffRows.length === 0 ? <EmptyChart text="No staff performance data yet." /> : <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={staffRows}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(v) => moneyShort(Number(v))} tick={{ fontSize: 10 }} /><Tooltip formatter={(value: any) => moneyShort(Number(value))} /><Legend /><Bar dataKey="pipeline" fill="#475569" radius={[4,4,0,0]} /><Bar dataKey="revenue" fill="#8c1018" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>}
      </section>
    </div>
  );
}
