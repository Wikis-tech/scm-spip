import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Target,
  UserRound,
  Users2,
  BriefcaseBusiness,
  Activity,
  BadgeCheck,
} from 'lucide-react';
import type { UserProfile } from '../types';

interface Client360Props {
  currentUser: UserProfile;
}

const PRODUCTS = ['Money Market Fund', 'SCIP', 'Portfolio Management', 'Securities', 'Treasury Solutions'];

const money = (value: any) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
}).format(Number(value || 0));

const statusTone = (status: string) => {
  if (['Converted', 'Won', 'Client'].includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['Lost', 'Archived'].includes(status)) return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export const Client360: React.FC<Client360Props> = ({ currentUser }) => {
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState<any | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversionOpen, setConversionOpen] = useState(false);
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [initialInvestment, setInitialInvestment] = useState('');
  const [currentAum, setCurrentAum] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProspects = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/crm/prospects');
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Unable to load CRM prospects.');
      setProspects(Array.isArray(payload) ? payload : []);
      if (!selectedId && payload?.[0]?.id) setSelectedId(payload[0].id);
    } catch (err: any) {
      setError(err?.message || 'Unable to load CRM prospects.');
    } finally { setLoading(false); }
  };

  const load360 = async (id = selectedId) => {
    if (!id) { setData(null); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/crm/prospects/${encodeURIComponent(id)}/360`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Unable to load Client 360.');
      setData(payload);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Client 360.');
      setData(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadProspects(); }, []);
  useEffect(() => { if (selectedId) load360(selectedId); }, [selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter((p) => [p.name, p.industry, p.location, p.assigned_officer_name].some(v => String(v || '').toLowerCase().includes(q)));
  }, [prospects, query]);

  const p = data?.prospect;
  const openTasks = (data?.tasks || []).filter((t: any) => !(t.is_completed || t.isCompleted || t.status === 'Completed'));
  const nextMeeting = [...(data?.meetings || [])].filter((m: any) => String(m.date || '') >= new Date().toISOString().slice(0,10)).sort((a:any,b:any) => String(a.date).localeCompare(String(b.date)))[0];

  const convertProspect = async () => {
    const amount = Number(initialInvestment);
    if (!product || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid product and initial investment amount.'); return;
    }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/crm/prospects/${encodeURIComponent(selectedId)}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, initialInvestment: amount, currentAum: Number(currentAum || amount) }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Unable to record conversion.');
      setConversionOpen(false); setInitialInvestment(''); setCurrentAum('');
      await Promise.all([loadProspects(), load360(selectedId)]);
    } catch (err: any) { setError(err?.message || 'Unable to record conversion.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-6 space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 md:px-7 py-6 bg-gradient-to-r from-slate-950 via-[#171c2a] to-[#671018] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-200">Relationship Management</div>
            <h1 className="text-2xl md:text-3xl font-black mt-2">Client 360</h1>
            <p className="text-sm text-slate-300 mt-2 max-w-3xl">The relationship workspace for every company you manage—from active prospect through conversion to funded client. Review contacts, meetings, tasks, product interest, AUM and the full activity history in one place.</p>
          </div>
          <button onClick={() => { loadProspects(); if (selectedId) load360(selectedId); }} className="self-start lg:self-auto rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold flex items-center gap-2 hover:bg-white/15">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh relationship
          </button>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[330px_minmax(0,1fr)] gap-5">
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden xl:sticky xl:top-20 xl:self-start">
          <div className="p-4 border-b border-slate-200">
            <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-5 text-blue-900">
              Prospects remain here while you build the relationship. Use <strong>Record conversion</strong> only after the company becomes a funded SCM client.
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search relationships..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm outline-none focus:border-[#8c1018]" />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
            {filtered.map((row) => (
              <button key={row.id} onClick={() => setSelectedId(row.id)} className={`w-full text-left p-4 hover:bg-slate-50 transition ${selectedId === row.id ? 'bg-red-50/70 border-l-4 border-[#8c1018]' : 'border-l-4 border-transparent'}`}>
                <div className="font-black text-sm text-slate-900 truncate">{row.name}</div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{row.industry} • {row.location}</div>
                <div className="flex items-center justify-between mt-2 gap-2"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${statusTone(String(row.status || 'Lead'))}`}>{row.status || 'Lead'}</span><span className="text-[10px] font-semibold text-slate-400 truncate">{row.assigned_officer_name || 'Unassigned'}</span></div>
              </button>
            ))}
            {!loading && filtered.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No relationships found.</div>}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {!p ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"><Building2 className="w-10 h-10 text-slate-300 mx-auto" /><h2 className="font-black text-slate-800 mt-3">Select a relationship</h2><p className="text-sm text-slate-500 mt-1">Choose a prospect or converted client from the directory to open the complete relationship record.</p></div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-[#8c1018] text-white flex items-center justify-center shrink-0"><Building2 className="w-6 h-6" /></div>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl md:text-2xl font-black text-slate-950 truncate">{p.name}</h2><span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${statusTone(String(p.status || 'Lead'))}`}>{p.status}</span></div><p className="text-sm text-slate-500 mt-1">{p.industry} • {p.org_type || 'Corporate'} • {p.location}</p><div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">{p.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{p.email}</span>}{p.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{p.phone}</span>}</div></div>
                  </div>
                  <div className="flex gap-2"><button onClick={() => setConversionOpen(v => !v)} className="rounded-xl bg-[#8c1018] text-white px-4 py-2.5 text-xs font-black hover:bg-[#751018] flex items-center gap-2"><BadgeCheck className="w-4 h-4" />Record conversion</button></div>
                </div>
              </section>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  ['Opportunity', money(p.opportunity_value), Target],
                  ['Current AUM', money(p.current_aum), CircleDollarSign],
                  ['Contacts', String(data.contacts?.length || 0), Users2],
                  ['Open tasks', String(openTasks.length), CheckCircle2],
                ].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span><Icon className="w-4 h-4 text-[#8c1018]" /></div><div className="mt-2 text-xl font-black text-slate-900">{value}</div></div>)}
              </div>

              {conversionOpen && <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-widest font-black text-[#8c1018]">Client conversion</div><h3 className="font-black text-slate-900 mt-1">Record funded relationship</h3></div><button onClick={() => setConversionOpen(false)} className="text-xs font-bold text-slate-500">Cancel</button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4"><select value={product} onChange={e => setProduct(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{PRODUCTS.map(x => <option key={x}>{x}</option>)}</select><input type="number" min="0" value={initialInvestment} onChange={e=>setInitialInvestment(e.target.value)} placeholder="Initial investment (₦)" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/><input type="number" min="0" value={currentAum} onChange={e=>setCurrentAum(e.target.value)} placeholder="Current AUM (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"/></div><button disabled={saving} onClick={convertProspect} className="mt-3 rounded-xl bg-[#8c1018] text-white px-4 py-2.5 text-xs font-black disabled:opacity-50">{saving ? 'Saving...' : 'Confirm conversion'}</button></section>}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Users2 className="w-4 h-4 text-[#8c1018]"/><h3 className="font-black text-slate-900">Key contacts</h3></div><div className="mt-4 divide-y divide-slate-100">{(data.contacts || []).slice(0,6).map((c:any)=><div key={c.id} className="py-3"><div className="font-bold text-sm text-slate-900">{c.full_name || c.fullName}</div><div className="text-xs text-slate-500">{c.position}{c.department ? ` • ${c.department}` : ''}</div></div>)}{(data.contacts || []).length===0&&<p className="text-sm text-slate-400 py-6">No contacts recorded.</p>}</div></section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><BriefcaseBusiness className="w-4 h-4 text-[#8c1018]"/><h3 className="font-black text-slate-900">Relationship snapshot</h3></div><dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"><div><dt className="text-[9px] uppercase font-black tracking-widest text-slate-400">Owner</dt><dd className="font-bold text-slate-800 mt-1">{p.assigned_officer_name || 'Unassigned'}</dd></div><div><dt className="text-[9px] uppercase font-black tracking-widest text-slate-400">Source</dt><dd className="font-bold text-slate-800 mt-1">{p.source || 'Unknown'}</dd></div><div><dt className="text-[9px] uppercase font-black tracking-widest text-slate-400">Relationship health</dt><dd className="font-bold text-slate-800 mt-1">{p.relationship_health || 'New'}</dd></div><div><dt className="text-[9px] uppercase font-black tracking-widest text-slate-400">Next meeting</dt><dd className="font-bold text-slate-800 mt-1">{nextMeeting ? `${nextMeeting.date} ${nextMeeting.time || ''}` : 'Not scheduled'}</dd></div></dl><div className="mt-5"><div className="text-[9px] uppercase font-black tracking-widest text-slate-400">Product interests</div><div className="flex flex-wrap gap-2 mt-2">{(p.product_interests || []).length ? p.product_interests.map((x:string)=><span key={x} className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700">{x}</span>) : <span className="text-sm text-slate-400">Not yet recorded.</span>}</div></div></section>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-[#8c1018]"/><h3 className="font-black text-slate-900">Relationship timeline</h3></div><div className="mt-4 space-y-3">{(data.timeline || []).slice(0,12).map((item:any,idx:number)=><div key={`${item.type}-${item.data?.id || idx}`} className="flex gap-3"><div className="mt-1 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">{item.type==='meeting'?<CalendarDays className="w-3.5 h-3.5 text-[#8c1018]"/>:item.type==='conversion'?<CircleDollarSign className="w-3.5 h-3.5 text-emerald-600"/>:<Clock3 className="w-3.5 h-3.5 text-slate-500"/>}</div><div className="pb-3 border-b border-slate-100 grow"><div className="text-xs font-black uppercase tracking-wide text-slate-700">{item.type}</div><div className="text-sm text-slate-600 mt-0.5">{item.data?.title || item.data?.purpose || item.data?.activity_type || item.data?.product || item.data?.notes || 'Relationship update'}</div><div className="text-[10px] text-slate-400 mt-1">{String(item.timestamp || '').replace('T',' ').slice(0,16)}</div></div></div>)}{(data.timeline || []).length===0&&<p className="text-sm text-slate-400 py-6">No relationship activity has been recorded yet.</p>}</div></section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
