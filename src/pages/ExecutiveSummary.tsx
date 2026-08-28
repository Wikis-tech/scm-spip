import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CircleDollarSign,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Users2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { ExecutiveRecharts } from '../components/analytics/BusinessCharts';
import { supabase } from '../lib/supabase';

interface ExecutiveSummaryProps {
  currentUser: UserProfile;
}

interface ExecutiveData {
  overview: {
    totalOfficers: number;
    totalActiveProspects: number;
    totalMeetingsHeld: number;
    totalInvestmentsClosed: number;
    totalFundsSecured: number;
    totalReportsSubmitted: number;
  };
  leaderboard: Array<{ id: string; fullName: string; amountSecured: number; dealsClosed: number; conversionRate: number }>;
  products: Array<{ productName: string; investmentsCount: number; totalAmount: number }>;
  reports: Array<{ id: string; officerName: string; weekEndDate: string; status: string; fundsSecured: number; prospectsAdded: number; meetingsHeld: number }>;
  insights: string[];
  activities?: Array<{ id: string; title: string; detail: string; timestamp: string }>;
}

const formatMoney = (value: number) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return `₦${amount.toLocaleString()}`;
};

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ currentUser }) => {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutiveData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Your secure session has expired. Please sign in again.');

      const response = await fetch('/api/admin/executive-dashboard-summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) throw new Error('Your secure session could not be verified. Please sign in again.');
        if (response.status === 403) throw new Error(payload?.error || 'Administrator access is required.');
        throw new Error(payload?.error || 'Management data is temporarily unavailable.');
      }
      setData(payload);
    } catch (err: any) {
      setError(err?.message || 'Unable to load the executive overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutiveData();
  }, [currentUser.id]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#b1191f]" />
          <p className="mt-3 text-sm text-slate-500">Loading management overview…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-9 w-9 text-red-500" />
        <h2 className="mt-4 text-lg font-bold text-slate-950">Executive overview unavailable</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button onClick={fetchExecutiveData} className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Try again</button>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Active prospects', value: data.overview.totalActiveProspects, helper: 'Across the team', icon: Building2 },
    { label: 'Meetings held', value: data.overview.totalMeetingsHeld, helper: 'Recorded interactions', icon: CalendarCheck2 },
    { label: 'Conversions', value: data.overview.totalInvestmentsClosed, helper: 'Funded relationships', icon: TrendingUp },
    { label: 'Converted AUM', value: formatMoney(data.overview.totalFundsSecured), helper: 'Funds secured', icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Administration</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Executive Overview</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">A concise view of pipeline health, client conversion and team activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right sm:block">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Approved team</div>
            <div className="mt-0.5 flex items-center justify-end gap-1.5 text-sm font-bold text-slate-900"><Users2 className="h-4 w-4 text-slate-500" />{data.overview.totalOfficers}</div>
          </div>
          <button onClick={fetchExecutiveData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{stat.label}</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{stat.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{stat.helper}</div>
                </div>
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div>
              </div>
            </div>
          );
        })}
      </section>

      <ExecutiveRecharts data={data} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-950">Management insights</h2>
            <p className="mt-1 text-xs text-slate-400">Current signals worth management attention</p>
          </div>
          <div className="divide-y divide-slate-100">
            {(data.insights || []).slice(0, 5).map((insight, index) => (
              <div key={index} className="flex gap-3 px-5 py-4">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#b1191f]" />
                <p className="text-sm leading-6 text-slate-600">{insight}</p>
              </div>
            ))}
            {(data.insights || []).length === 0 && <EmptyRow text="Insights will appear as team activity is recorded." />}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-950">Top relationships</h2>
            <p className="mt-1 text-xs text-slate-400">Officers ranked by recorded funds secured</p>
          </div>
          <div className="divide-y divide-slate-100">
            {(data.leaderboard || []).slice(0, 5).map((row, index) => (
              <div key={row.id || index} className="flex items-center gap-3 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{row.fullName}</div>
                  <div className="mt-1 text-xs text-slate-400">{row.dealsClosed} conversion{row.dealsClosed === 1 ? '' : 's'}</div>
                </div>
                <div className="text-sm font-bold text-slate-900">{formatMoney(row.amountSecured)}</div>
              </div>
            ))}
            {(data.leaderboard || []).length === 0 && <EmptyRow text="No conversion data has been recorded yet." />}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Recent weekly reports</h2>
            <p className="mt-1 text-xs text-slate-400">Latest submitted team reporting</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-400">
              <tr><th className="px-5 py-3 font-semibold">Officer</th><th className="px-5 py-3 font-semibold">Week ending</th><th className="px-5 py-3 font-semibold">Prospects</th><th className="px-5 py-3 font-semibold">Meetings</th><th className="px-5 py-3 font-semibold">Funds secured</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.reports || []).slice(0, 6).map((report) => (
                <tr key={report.id} className="text-slate-600"><td className="px-5 py-3.5 font-medium text-slate-900">{report.officerName}</td><td className="px-5 py-3.5">{report.weekEndDate || '—'}</td><td className="px-5 py-3.5">{report.prospectsAdded || 0}</td><td className="px-5 py-3.5">{report.meetingsHeld || 0}</td><td className="px-5 py-3.5 font-semibold">{formatMoney(report.fundsSecured)}</td></tr>
              ))}
              {(data.reports || []).length === 0 && <tr><td colSpan={5}><EmptyRow text="No weekly reports have been submitted yet." /></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const EmptyRow = ({ text }: { text: string }) => <div className="px-5 py-8 text-center text-sm text-slate-400">{text}</div>;
