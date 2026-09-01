import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  BriefcaseBusiness,
  FileDown,
  FileText,
  Mail,
  MessageSquarePlus,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

type Mode = 'assistant' | 'research' | 'proposal' | 'email' | 'meeting' | 'followup' | 'analysis';
type Classification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';

type Conversation = {
  id: string;
  title: string;
  mode?: Mode;
  data_classification?: Classification;
  updated_at?: string;
};

type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  model?: string;
  created_at?: string;
};

type SourceDoc = {
  id: string;
  filename: string;
  byte_size?: number;
};

const MODES: Array<{ id: Mode; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'assistant', label: 'Ask Copilot', hint: 'Practical day-to-day support', icon: Sparkles },
  { id: 'research', label: 'Deep Research', hint: 'Evidence-led company analysis', icon: Search },
  { id: 'proposal', label: 'Draft Proposal', hint: 'Institutional proposal drafting', icon: BriefcaseBusiness },
  { id: 'email', label: 'Write Email', hint: 'Natural professional outreach', icon: Mail },
  { id: 'meeting', label: 'Meeting Brief', hint: 'Prepare talking points and questions', icon: Users },
  { id: 'analysis', label: 'Analyse', hint: 'Structured commercial analysis', icon: FileText },
];

interface IntelligenceCopilotProps {
  currentUser: UserProfile;
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return <>{parts.map((part, index) => part.startsWith('**') && part.endsWith('**') ? <strong key={index} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong> : <React.Fragment key={index}>{part}</React.Fragment>)}</>;
}

function FormattedMessage({ content }: { content: string }) {
  const cleaned = String(content || '').replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim();
  const lines = cleaned.split('\n');
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    nodes.push(<ul key={`b-${nodes.length}`} className="my-2 list-disc space-y-1 pl-5">{bullets.map((item, i) => <li key={i}><InlineText text={item} /></li>)}</ul>);
    bullets = [];
  };
  const flushNumbers = () => {
    if (!numbers.length) return;
    nodes.push(<ol key={`n-${nodes.length}`} className="my-2 list-decimal space-y-1 pl-5">{numbers.map((item, i) => <li key={i}><InlineText text={item} /></li>)}</ol>);
    numbers = [];
  };
  const flushLists = () => { flushBullets(); flushNumbers(); };

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushLists();
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushNumbers();
      bullets.push(trimmed.replace(/^[-*]\s+/, ''));
      return;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      flushBullets();
      numbers.push(trimmed.replace(/^\d+[.)]\s+/, ''));
      return;
    }
    flushLists();
    if (trimmed.startsWith('### ')) {
      nodes.push(<h4 key={index} className="mb-1 mt-4 text-sm font-bold text-slate-900"><InlineText text={trimmed.slice(4)} /></h4>);
    } else if (trimmed.startsWith('## ')) {
      nodes.push(<h3 key={index} className="mb-1.5 mt-4 text-[15px] font-bold text-slate-900"><InlineText text={trimmed.slice(3)} /></h3>);
    } else if (trimmed.startsWith('# ')) {
      nodes.push(<h2 key={index} className="mb-2 mt-4 text-base font-bold text-slate-900"><InlineText text={trimmed.slice(2)} /></h2>);
    } else if (trimmed.startsWith('> ')) {
      nodes.push(<blockquote key={index} className="my-2 border-l-2 border-slate-300 pl-3 text-slate-600"><InlineText text={trimmed.slice(2)} /></blockquote>);
    } else if (/^---+$/.test(trimmed)) {
      nodes.push(<hr key={index} className="my-3 border-slate-200" />);
    } else {
      nodes.push(<p key={index} className="my-1.5 leading-6"><InlineText text={trimmed} /></p>);
    }
  });
  flushLists();
  return <div className="break-words">{nodes}</div>;
}

export const IntelligenceCopilot: React.FC<IntelligenceCopilotProps> = ({ currentUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('assistant');
  const [classification, setClassification] = useState<Classification>('INTERNAL');
  const [documents, setDocuments] = useState<SourceDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [providersReady, setProvidersReady] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const activeConversationKey = `spip-copilot-active:${currentUser.id}`;

  const authedFetch = async (url: string, options: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers, cache: 'no-store' });
  };

  const fetchConversations = async (): Promise<Conversation[]> => {
    try {
      const res = await authedFetch('/api/ai/conversations');
      if (!res.ok) return [];
      const data = await res.json();
      const rows = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : [];
      setConversations(rows);
      return rows;
    } catch {
      return [];
    }
  };

  const loadConversation = async (id: string, silent = false) => {
    if (!silent) setError('');
    try {
      const res = await authedFetch(`/api/ai/conversations/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to open this conversation.');
      const conversation = data.conversation || data;
      const rows = data.messages || conversation.messages || [];
      setConversationId(id);
      window.localStorage.setItem(activeConversationKey, id);
      setMessages(Array.isArray(rows) ? rows : []);
      if (conversation.mode && MODES.some((item) => item.id === conversation.mode)) setMode(conversation.mode);
      if (['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'].includes(conversation.data_classification)) setClassification(conversation.data_classification);
      setDocuments([]);
      return true;
    } catch (err: any) {
      if (!silent) setError(err.message || 'Unable to open this conversation.');
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const initialise = async () => {
      setHistoryLoading(true);
      const rows = await fetchConversations();
      if (cancelled) return;
      const remembered = window.localStorage.getItem(activeConversationKey);
      const preferred = remembered && rows.some((item) => item.id === remembered) ? remembered : rows[0]?.id;
      if (preferred) await loadConversation(preferred, true);
      setHistoryLoading(false);
    };
    initialise();
    authedFetch('/api/ai/status')
      .then(async (res) => res.ok ? res.json() : null)
      .then((data) => { if (!cancelled) setProvidersReady(Boolean(data?.ready)); })
      .catch(() => { if (!cancelled) setProvidersReady(false); });
    return () => { cancelled = true; };
  }, [currentUser.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const startNew = () => {
    window.localStorage.removeItem(activeConversationKey);
    setConversationId(null);
    setMessages([]);
    setDocuments([]);
    setPrompt('');
    setError('');
    setNotice('');
    setMode('assistant');
    setClassification('INTERNAL');
  };

  const sendPrompt = async () => {
    const query = prompt.trim();
    if (!query || busy) return;
    setError('');
    setNotice('');
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setBusy(true);
    try {
      const res = await authedFetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, conversationId, mode, classification, documentIds: documents.map((doc) => doc.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'SCM Intelligence Copilot is temporarily unavailable.');
      const nextConversationId = data.conversationId || conversationId;
      setConversationId(nextConversationId || null);
      if (nextConversationId) window.localStorage.setItem(activeConversationKey, nextConversationId);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.reply || 'No response was returned.',
        provider: data.provider,
        model: data.model,
      }]);
      if (data?.persistence?.saved === false) {
        setNotice(data?.persistence?.warning || 'This reply worked, but conversation history could not be saved.');
      }
      await fetchConversations();
    } catch (err: any) {
      setMessages((prev) => prev.filter((item, index) => !(index === prev.length - 1 && item.role === 'user' && item.content === query)));
      setPrompt(query);
      setError(err.message || 'Unable to complete this request.');
    } finally {
      setBusy(false);
    }
  };

  const uploadSource = async (file: File) => {
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Source files must be smaller than 5 MB.');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await authedFetch('/api/ai/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type || 'application/octet-stream', base64, conversationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'This source document could not be uploaded.');
      setDocuments((prev) => [...prev.filter((item) => item.id !== data.document.id), data.document]);
    } catch (err: any) {
      setError(err.message || 'Unable to upload this source document.');
    } finally {
      setUploading(false);
    }
  };

  const latestAssistant = useMemo(() => [...messages].reverse().find((item) => item.role === 'assistant'), [messages]);

  const exportDraft = async (format: 'docx' | 'pdf' | 'pptx' | 'xlsx') => {
    if (!latestAssistant?.content || exporting) return;
    setExporting(format);
    setError('');
    try {
      const title = conversations.find((item) => item.id === conversationId)?.title || `${mode === 'proposal' ? 'SCM Proposal Draft' : 'SCM Intelligence Draft'}`;
      const res = await authedFetch('/api/ai/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, format, title, content: latestAssistant.content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The export could not be generated.');
      if (!data.signedUrl) throw new Error('The export was created but a secure download link was not returned.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message || 'Unable to export this draft.');
    } finally {
      setExporting(null);
    }
  };

  const deleteConversation = async (id: string) => {
    if (!window.confirm('Delete this private Copilot conversation?')) return;
    const res = await authedFetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) return;
    if (conversationId === id) {
      window.localStorage.removeItem(activeConversationKey);
      setConversationId(null);
      setMessages([]);
    }
    const rows = await fetchConversations();
    if (conversationId === id && rows[0]?.id) await loadConversation(rows[0].id, true);
  };

  return (
    <div className="grid min-h-[calc(100vh-8.5rem)] grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        <button onClick={startNew} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b1191f] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#93151a]">
          <MessageSquarePlus className="h-4 w-4" /> New conversation
        </button>
        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Private history</div>
        <div className="space-y-1">
          {historyLoading && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Loading your conversations…</div>}
          {!historyLoading && conversations.length === 0 && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No saved conversations yet. Your first saved chat will appear here.</div>}
          {conversations.slice(0, 30).map((conversation) => (
            <div key={conversation.id} className={`group flex items-center gap-1 rounded-xl ${conversationId === conversation.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
              <button onClick={() => loadConversation(conversation.id)} className="min-w-0 flex-1 px-3 py-2 text-left">
                <div className="truncate text-xs font-semibold text-slate-700">{conversation.title}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] capitalize text-slate-400">
                  <span>{conversation.mode || 'assistant'}</span>
                  {conversation.updated_at && <span>• {new Date(conversation.updated_at).toLocaleDateString()}</span>}
                </div>
              </button>
              <button onClick={() => deleteConversation(conversation.id)} className="mr-1 hidden rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 group-hover:block" title="Delete conversation"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#091b2d] text-white"><Bot className="h-5 w-5" /></div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">SCM Intelligence Copilot</h1>
                <p className="text-xs text-slate-500">Research, proposals, emails, meeting briefs and structured analysis.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${providersReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {providersReady ? 'AI ROUTER READY' : 'PROVIDER CHECK'}
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Private to {currentUser.fullName}</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {MODES.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => setMode(item.id)} title={item.hint} className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${mode === item.id ? 'border-[#b1191f] bg-red-50 text-[#b1191f]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}><Icon className="h-3.5 w-3.5" /> {item.label}</button>;
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={classification} onChange={(e) => setClassification(e.target.value as Classification)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#b1191f]">
              <option value="PUBLIC">Public data</option>
              <option value="INTERNAL">Internal SCM</option>
              <option value="CONFIDENTIAL">Confidential</option>
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Add source document'}
              <input type="file" className="hidden" accept=".docx,.xlsx,.xls,.csv,.txt,.md,.json" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadSource(e.target.files[0])} />
            </label>
            {documents.map((doc) => <span key={doc.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 text-[10px] text-slate-600"><Paperclip className="h-3 w-3" /> {doc.filename}</span>)}
          </div>
        </header>

        {error && <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:mx-5">{error}</div>}
        {notice && <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:mx-5">{notice}</div>}

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 && !historyLoading && (
            <div className="mx-auto max-w-2xl py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#091b2d] text-white"><Sparkles className="h-6 w-6" /></div>
              <h2 className="text-xl font-bold text-slate-900">What do you need to get done?</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Use approved SCM context, CRM research and your uploaded source material. Copilot is instructed not to invent client facts or financial figures.</p>
              <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                {['Draft a tailored institutional proposal for this prospect.','Prepare a meeting brief from the available CRM information.','Write a concise follow-up email after our last discussion.','Analyse this company and identify the information we still need.'].map((example) => <button key={example} onClick={() => setPrompt(example)} className="rounded-xl border border-slate-200 p-3 text-xs leading-5 text-slate-600 hover:border-slate-300 hover:bg-slate-50">{example}</button>)}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={`${message.id || message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[94%] rounded-2xl px-4 py-3 text-sm sm:max-w-[84%] ${message.role === 'user' ? 'bg-[#091b2d] text-white' : 'border border-slate-200 bg-white text-slate-800 shadow-sm'}`}>
                {message.role === 'assistant' ? <FormattedMessage content={message.content} /> : <div className="whitespace-pre-wrap leading-6">{message.content}</div>}
              </div>
            </div>
          ))}
          {busy && <div className="flex justify-start"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Copilot is working…</div></div>}
          <div ref={endRef} />
        </div>

        {latestAssistant && (
          <div className="border-t border-slate-100 px-4 py-2 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Export latest draft</span>
              {(['docx', 'pdf', 'pptx', 'xlsx'] as const).map((format) => <button key={format} onClick={() => exportDraft(format)} disabled={Boolean(exporting)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 disabled:opacity-50"><FileDown className="h-3 w-3" /> {exporting === format ? 'Creating…' : format}</button>)}
            </div>
          </div>
        )}

        <footer className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#b1191f] focus-within:ring-1 focus-within:ring-red-100">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(); } }} rows={2} placeholder={mode === 'proposal' ? 'Describe the client, objective and proposal you need…' : mode === 'research' ? 'What should Copilot investigate or analyse?' : 'Ask SCM Intelligence Copilot…'} className="max-h-40 min-h-[52px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
            <button onClick={sendPrompt} disabled={!prompt.trim() || busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b1191f] text-white hover:bg-[#93151a] disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><ShieldCheck className="h-3 w-3" /> AI drafts require employee review before external use. Private conversations are isolated by user account.</div>
        </footer>
      </section>
    </div>
  );
};
