import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, RefreshCw, Save, Send } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface WeeklyReportProps {
  currentUser: UserProfile;
}

export interface ReportData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  weekStartDate: string;
  weekEndDate: string;
  summary: string;
  prospectsAdded: number;
  meetingsHeld: number;
  followUpsCompleted: number;
  fundsSecured: number;
  productsSold: string;
  challenges: string;
  nextWeekPlan: string;
  status: 'Draft' | 'Submitted' | 'Reviewed';
  submittedAt?: string | null;
  updatedAt: string;
}

const weekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return {
    start: monday.toISOString().slice(0, 10),
    end: friday.toISOString().slice(0, 10),
  };
};

const emptyForm = () => {
  const range = weekRange();
  return {
    weekStartDate: range.start,
    weekEndDate: range.end,
    summary: '',
    prospectsAdded: 0,
    meetingsHeld: 0,
    followUpsCompleted: 0,
    fundsSecured: 0,
    productsSold: '',
    challenges: '',
    nextWeekPlan: '',
  };
};

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  const selected = useMemo(() => reports.find((report) => report.id === selectedId) || null, [reports, selectedId]);
  const locked = Boolean(selected && selected.status !== 'Draft');

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/weekly-reports');
      const payload = await response.json().catch(() => []);
      if (!response.ok) throw new Error(payload?.error || 'Unable to load your weekly reports.');
      const rows = Array.isArray(payload) ? payload : [];
      setReports(rows);
      if (rows.length > 0) {
        const report = rows[0];
        setSelectedId(report.id);
        setForm({
          weekStartDate: report.weekStartDate,
          weekEndDate: report.weekEndDate,
          summary: report.summary || '',
          prospectsAdded: report.prospectsAdded || 0,
          meetingsHeld: report.meetingsHeld || 0,
          followUpsCompleted: report.followUpsCompleted || 0,
          fundsSecured: report.fundsSecured || 0,
          productsSold: report.productsSold || '',
          challenges: report.challenges || '',
          nextWeekPlan: report.nextWeekPlan || '',
        });
      }
    } catch (error: any) {
      setFeedback({ tone: 'error', text: error?.message || 'Unable to load reports.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [currentUser.id]);

  const generateCurrentWeek = async () => {
    const range = weekRange();
    setFeedback(null);
    setSaving(true);
    try {
      const response = await authenticatedFetch(`/api/weekly-reports/auto-generate?weekStartDate=${range.start}&weekEndDate=${range.end}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to prepare this week’s report.');
      setSelectedId(null);
      setForm({
        weekStartDate: range.start,
        weekEndDate: range.end,
        summary: payload.summary || '',
        prospectsAdded: Number(payload.prospectsAdded || 0),
        meetingsHeld: Number(payload.meetingsHeld || 0),
        followUpsCompleted: Number(payload.followUpsCompleted || 0),
        fundsSecured: Number(payload.fundsSecured || 0),
        productsSold: payload.productsSold || 'None',
        challenges: '',
        nextWeekPlan: '',
      });
      setFeedback({ tone: 'success', text: 'This week’s activity metrics were prepared from SPIP.' });
    } catch (error: any) {
      setFeedback({ tone: 'error', text: error?.message || 'Unable to prepare this week’s report.' });
    } finally {
      setSaving(false);
    }
  };

  const save = async (status: 'Draft' | 'Submitted') => {
    setFeedback(null);
    if (!form.summary.trim() || !form.productsSold.trim() || !form.challenges.trim() || !form.nextWeekPlan.trim()) {
      setFeedback({ tone: 'error', text: 'Complete the summary, products, challenges and next-week plan before saving.' });
      return;
    }
    setSaving(true);
    try {
      const response = await authenticatedFetch('/api/weekly-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: selected?.id, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to save this weekly report.');
      setFeedback({ tone: 'success', text: status === 'Submitted' ? 'Weekly report submitted to management.' : 'Draft saved.' });
      await loadReports();
    } catch (error: any) {
      setFeedback({ tone: 'error', text: error?.message || 'Unable to save this report.' });
    } finally {
      setSaving(false);
    }
  };

  const chooseReport = (report: ReportData) => {
    setSelectedId(report.id);
    setFeedback(null);
    setForm({
      weekStartDate: report.weekStartDate,
      weekEndDate: report.weekEndDate,
      summary: report.summary || '',
      prospectsAdded: report.prospectsAdded || 0,
      meetingsHeld: report.meetingsHeld || 0,
      followUpsCompleted: report.followUpsCompleted || 0,
      fundsSecured: report.fundsSecured || 0,
      productsSold: report.productsSold || '',
      challenges: report.challenges || '',
      nextWeekPlan: report.nextWeekPlan || '',
    });
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Reporting</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Weekly Report</h1>
          <p className="mt-2 text-sm text-slate-500">Record progress, challenges and priorities for management review.</p>
        </div>
        <button onClick={generateCurrentWeek} disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} /> Prepare current week
        </button>
      </section>

      {feedback && <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{feedback.text}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px,minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Report history</div>
          {loading ? <div className="px-2 py-8 text-center text-sm text-slate-400">Loading…</div> : reports.length === 0 ? <div className="px-2 py-8 text-center text-sm text-slate-400">No reports yet.</div> : (
            <div className="space-y-1">
              {reports.map((report) => (
                <button key={report.id} onClick={() => chooseReport(report)} className={`w-full rounded-xl px-3 py-3 text-left ${selectedId === report.id ? 'bg-slate-950 text-white' : 'hover:bg-slate-50'}`}>
                  <div className="text-xs font-semibold">Week of {report.weekStartDate}</div>
                  <div className={`mt-1 text-[10px] ${selectedId === report.id ? 'text-slate-300' : 'text-slate-400'}`}>{report.status}</div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">{form.weekStartDate} to {form.weekEndDate}</h2>
              <p className="mt-1 text-xs text-slate-400">{selected ? `Status: ${selected.status}` : 'New draft'}</p>
            </div>
            {locked && <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Locked after submission</span>}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <NumberField label="Prospects added" value={form.prospectsAdded} disabled={locked} onChange={(value) => setForm((current) => ({ ...current, prospectsAdded: value }))} />
            <NumberField label="Meetings held" value={form.meetingsHeld} disabled={locked} onChange={(value) => setForm((current) => ({ ...current, meetingsHeld: value }))} />
            <NumberField label="Follow-ups" value={form.followUpsCompleted} disabled={locked} onChange={(value) => setForm((current) => ({ ...current, followUpsCompleted: value }))} />
            <NumberField label="Funds secured (₦)" value={form.fundsSecured} disabled={locked} onChange={(value) => setForm((current) => ({ ...current, fundsSecured: value }))} />
          </div>

          <div className="mt-6 space-y-4">
            <TextArea label="Summary" value={form.summary} disabled={locked} onChange={(value) => setForm((current) => ({ ...current, summary: value }))} placeholder="What did you accomplish this week?" />
            <TextArea label="Products sold / recommended" value={form.productsSold} disabled={locked} onChange={(value) => setForm((current) => ({ ...current, productsSold: value }))} placeholder="e.g. Money Market Fund, SCIP" />
            <TextArea label="Challenges" value={form.challenges} disabled={locked} onChange={(value) => setForm((current) => ({ ...current, challenges: value }))} placeholder="What slowed progress or needs support?" />
            <TextArea label="Next week plan" value={form.nextWeekPlan} disabled={locked} onChange={(value) => setForm((current) => ({ ...current, nextWeekPlan: value }))} placeholder="Top priorities and next actions" />
          </div>

          {!locked && (
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
              <button disabled={saving} onClick={() => save('Draft')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Save className="h-4 w-4" /> Save draft</button>
              <button disabled={saving} onClick={() => save('Submitted')} className="inline-flex items-center gap-2 rounded-xl bg-[#b1191f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#94151a] disabled:opacity-50"><Send className="h-4 w-4" /> Submit report</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const NumberField = ({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) => (
  <label className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
    <input disabled={disabled} min={0} type="number" value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value || 0)))} className="mt-2 w-full bg-transparent text-lg font-bold text-slate-900 outline-none disabled:text-slate-500" />
  </label>
);

const TextArea = ({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled?: boolean }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
    <textarea disabled={disabled} rows={4} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500" />
  </label>
);
