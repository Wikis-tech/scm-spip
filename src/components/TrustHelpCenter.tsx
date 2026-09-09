import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, HelpCircle, LifeBuoy, MessageSquare, Plus, RefreshCw, Search, Send, Sparkles, X } from 'lucide-react';
import type { UserProfile } from '../types';

type TicketMessage = { id: string; body: string; is_admin_reply: boolean; created_at: string };
type Ticket = { id: string; subject: string; category: string; description: string; status: string; updated_at: string; requester_name?: string; requester_email?: string; support_ticket_messages?: TicketMessage[] };
const FAQS = [
  ['How do I add and manage a prospect?', 'Open Prospects to add a company, assign an owner, record its opportunity and set the next action. Client 360 contains the complete relationship history.'],
  ['How does Apex Discovery work?', 'Apex Discovery allocates one unique company to your private queue. You can dismiss it or import it as your prospect. Another employee will not receive the same allocation.'],
  ['Where can I see performance?', 'Use Relationship Pipeline for deal stages, Dashboard for today’s work, and Analytics for period-based KPIs. Staff see only their assigned records.'],
  ['How should I use Intelligence Copilot?', 'Copilot checks your permitted SPIP records first and can supplement gaps with public research. It prepares research, emails, proposals, meeting briefs and exports.'],
  ['Which files are supported?', 'Sources: DOCX, PPTX, XLSX, CSV, TXT, Markdown and JSON. Exports: DOCX, PDF, PPTX and XLSX. Upload confidential material only when authorised.'],
  ['Why can’t I see another employee’s records?', 'SPIP isolates staff data by ownership. HOD and Super Admin roles have authorised team-level supervision and reporting views.'],
  ['What if a page keeps loading?', 'Check your connection, refresh once and select Retry sync. If it continues, create a ticket with the page, action and exact error.'],
  ['How do I install SPIP?', 'On Android use Install SPIP or Add to Home screen. On iPhone Safari use Share, then Add to Home Screen. CRM records are not stored offline.'],
] as const;

export const TrustHelpCenter: React.FC<{ isOpen?: boolean; onClose: () => void; onStartTour: () => void; currentUser: UserProfile; scmFetch: (url: string, options?: RequestInit) => Promise<Response> }> = ({ isOpen = true, onClose, onStartTour, currentUser, scmFetch }) => {
  const [tab, setTab] = useState<'guide'|'faq'|'tickets'>('guide');
  const [query, setQuery] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ subject: '', category: 'TECHNICAL', description: '' });
  const [reply, setReply] = useState('');
  const isAdmin = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await scmFetch('/api/support/tickets');
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'Unable to load support requests.');
      setTickets(data); setSelected((id) => id || data[0]?.id || '');
    } catch (error: any) { setNotice(error.message); } finally { setLoading(false); }
  }, [scmFetch]);
  useEffect(() => { if (isOpen && tab === 'tickets') void loadTickets(); }, [isOpen, tab, loadTickets]);
  const activeTicket = tickets.find((ticket) => ticket.id === selected);
  const filteredFaqs = useMemo(() => FAQS.filter(([q,a]) => `${q} ${a}`.toLowerCase().includes(query.toLowerCase())), [query]);

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setNotice('');
    try {
      const response = await scmFetch('/api/support/tickets', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to submit your request.');
      setForm({subject:'',category:'TECHNICAL',description:''}); setNotice('Support request submitted.'); await loadTickets(); setSelected(data.id);
    } catch (error:any) { setNotice(error.message); } finally { setLoading(false); }
  };
  const sendReply = async () => {
    if (!activeTicket || !reply.trim()) return; setLoading(true); setNotice('');
    try {
      const response = await scmFetch(`/api/support/tickets/${activeTicket.id}/replies`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({body:reply}) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Unable to send reply.');
      setReply(''); setNotice('Reply sent.'); await loadTickets();
    } catch(error:any) { setNotice(error.message); } finally { setLoading(false); }
  };
  const changeStatus = async (status:string) => {
    if (!activeTicket || !isAdmin) return; setLoading(true);
    try {
      const response = await scmFetch(`/api/support/tickets/${activeTicket.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Unable to update status.');
      setNotice('Ticket status updated.'); await loadTickets();
    } catch(error:any) { setNotice(error.message); } finally { setLoading(false); }
  };
  if (!isOpen) return null;

  return <><button aria-label="Close help center" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px]"/><aside role="dialog" aria-modal="true" aria-label="SPIP Help and Support" className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[520px]">
    <header className="flex items-center justify-between bg-slate-950 p-5 text-white"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#b1191f]"><LifeBuoy className="h-5 w-5"/></span><div><h2 className="font-bold">Help & Support</h2><p className="text-xs text-slate-400">Answers and administrator support</p></div></div><button onClick={onClose} aria-label="Close help center" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10"><X className="h-5 w-5"/></button></header>
    <nav className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 p-2" aria-label="Help sections">{([['guide','Guide',BookOpen],['faq','FAQs',HelpCircle],['tickets',isAdmin?'Admin inbox':'My tickets',MessageSquare]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold ${tab===id?'bg-white text-[#b1191f] shadow-sm':'text-slate-500'}`}><Icon className="h-4 w-4"/>{label}</button>)}</nav>
    <div className="flex-1 overflow-y-auto p-5">{notice&&<div role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">{notice}</div>}
      {tab==='guide'&&<div className="space-y-5"><div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white"><Sparkles className="mb-3 h-6 w-6 text-amber-400"/><h3 className="text-lg font-bold">Learn SPIP step by step</h3><p className="mt-2 text-sm leading-6 text-slate-300">Learn the dashboard, prospects, Client 360, Copilot, Analytics and secure mobile use.</p><button onClick={()=>{onClose();onStartTour();}} className="mt-4 min-h-11 rounded-xl bg-[#b1191f] px-4 text-sm font-bold">Start guided tour</button></div>{['Review Dashboard priorities','Find or add a prospect','Track the relationship','Research and prepare materials','Measure performance in Analytics'].map((item,i)=><div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-xs font-bold text-[#b1191f]">{i+1}</span><span className="text-sm font-semibold">{item}</span></div>)}</div>}
      {tab==='faq'&&<div className="space-y-4"><div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search common questions" className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm"/></div>{filteredFaqs.map(([q,a])=><details key={q} className="group rounded-xl border border-slate-200 p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">{q}<ChevronDown className="h-4 w-4 group-open:rotate-180"/></summary><p className="mt-3 text-sm leading-6 text-slate-600">{a}</p></details>)}{filteredFaqs.length===0&&<p className="py-8 text-center text-sm text-slate-500">No matching answer. Open My tickets to contact an administrator.</p>}</div>}
      {tab==='tickets'&&<div className="space-y-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">{isAdmin?'Support inbox':'Your support requests'}</h3><p className="text-xs text-slate-500">{isAdmin?'Answer employee requests.':'Track administrator replies.'}</p></div><button onClick={loadTickets} disabled={loading} aria-label="Refresh tickets" className="grid h-11 w-11 place-items-center rounded-xl border"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/></button></div>
        {!isAdmin&&<form onSubmit={createTicket} className="space-y-3 rounded-2xl border bg-slate-50 p-4"><div className="flex items-center gap-2 font-bold"><Plus className="h-4 w-4"/>Contact an administrator</div><input required minLength={4} maxLength={140} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Short description" className="min-h-11 w-full rounded-xl border px-3 text-sm"/><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="min-h-11 w-full rounded-xl border px-3 text-sm"><option value="TECHNICAL">Technical problem</option><option value="ACCESS">Access or permission</option><option value="DATA">CRM data</option><option value="COPILOT">Copilot</option><option value="EXPORT">Upload or export</option><option value="OTHER">Other</option></select><textarea required minLength={10} maxLength={4000} rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Page, action and exact error" className="w-full rounded-xl border p-3 text-sm"/><button disabled={loading} className="min-h-11 w-full rounded-xl bg-[#b1191f] text-sm font-bold text-white">Submit support request</button></form>}
        <div className="grid gap-2">{tickets.map(t=><button key={t.id} onClick={()=>setSelected(t.id)} className={`rounded-xl border p-3 text-left ${selected===t.id?'border-[#b1191f] bg-red-50':'border-slate-200'}`}><div className="flex justify-between gap-2"><span className="truncate text-sm font-semibold">{t.subject}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold">{t.status.replace('_',' ')}</span></div><p className="mt-1 text-xs text-slate-500">{t.category} • {new Date(t.updated_at).toLocaleDateString()}</p></button>)}{!loading&&tickets.length===0&&<div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No support tickets yet.</div>}</div>
        {activeTicket&&<section className="rounded-2xl border p-4"><h4 className="font-bold">{activeTicket.subject}</h4>{isAdmin&&<p className="mt-1 text-xs text-slate-500">{activeTicket.requester_name} • {activeTicket.requester_email}</p>}<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{activeTicket.description}</p><div className="mt-4 space-y-2">{(activeTicket.support_ticket_messages||[]).sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(m=><div key={m.id} className={`rounded-xl p-3 text-sm ${m.is_admin_reply?'bg-slate-950 text-white':'bg-slate-100'}`}><p className="whitespace-pre-wrap">{m.body}</p><span className="mt-2 block text-[10px] opacity-60">{m.is_admin_reply?'Administrator':'Employee'} • {new Date(m.created_at).toLocaleString()}</span></div>)}</div><textarea value={reply} onChange={e=>setReply(e.target.value)} maxLength={4000} rows={3} placeholder="Write a reply" className="mt-4 w-full rounded-xl border p-3 text-sm"/><button onClick={sendReply} disabled={loading||!reply.trim()} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"><Send className="h-4 w-4"/>Send reply</button>{isAdmin&&<div className="mt-4 flex flex-wrap gap-2">{['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s=><button key={s} onClick={()=>changeStatus(s)} className="min-h-10 rounded-lg border px-3 text-xs font-semibold">{s.replace('_',' ')}</button>)}</div>}</section>}</div>}
    </div><footer className="border-t p-4 text-center text-xs text-slate-500">Tickets are visible only to you and authorised administrators.</footer>
  </aside></>;
};
