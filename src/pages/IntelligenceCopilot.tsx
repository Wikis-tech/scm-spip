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

type SourceDoc = { id: string; filename: string; byte_size?: number };

type ProviderStatus = {
  id: string;
  label: string;
  configured: boolean;
  model?: string;
};

const MODES: Array<{ id: Mode; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'assistant', label: 'Ask Copilot', hint: 'Day-to-day work support', icon: Sparkles },
  { id: 'research', label: 'Deep Research', hint: 'Evidence-led company analysis', icon: Search },
  { id: 'proposal', label: 'Draft Proposal', hint: 'Institutional proposal drafting', icon: BriefcaseBusiness },
  { id: 'email', label: 'Write Email', hint: 'Professional outreach', icon: Mail },
  { id: 'meeting', label: 'Meeting Brief', hint: 'Talking points and questions', icon: Users },
  { id: 'analysis', label: 'Analyse', hint: 'Structured commercial analysis', icon: FileText },
];

interface IntelligenceCopilotProps {
  currentUser: UserProfile;
}

function inlineParts(text: string) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-slate-100 px-1 py-0.5 text-[0.92em]">{part.slice(1, -1)}</code>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function RichMessage({ content }: { content: string }) {
  const lines = String(content || '').replace(/\r\n/g, '\n').replace(/\\n/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  const flush = () => {
    if (bullets.length) {
      nodes.push(
        <ul key={`b-${nodes.length}`} className="my-2 list-disc space-y-1 pl-5">
          {bullets.map((item, i) => <li key={i}>{inlineParts(item)}</li>)}
        </ul>,
      );
      bullets = [];
    }
    if (numbers.length) {
      nodes.push(
        <ol key={`n-${nodes.length}`} className="my-2 list-decimal space-y-1 pl-5">
          {numbers.map((item, i) => <li key={i}>{inlineParts(item)}</li>)}
        </ol>,
      );
      numbers = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) { flush(); i += 1; continue; }

    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flush();
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      nodes.push(
        <div key={`t-${nodes.length}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>{headers.map((cell, idx) => <th key={idx} className="border-b border-slate-200 px-3 py-2 font-semibold">{inlineParts(cell)}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="align-top">
                  {headers.map((_, cellIndex) => <td key={cellIndex} className="px-3 py-2 text-slate-700">{inlineParts(row[cellIndex] || '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      if (numbers.length) flush();
      bullets.push(trimmed.replace(/^[-*•]\s+/, ''));
      i += 1;
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      if (bullets.length) flush();
      numbers.push(trimmed.replace(/^\d+[.)]\s+/, ''));
      i += 1;
      continue;
    }

    flush();
    if (trimmed.startsWith('### ')) nodes.push(<h4 key={i} className="mb-1 mt-4 text-sm font-bold text-slate-900">{inlineParts(trimmed.slice(4))}</h4>);
    else if (trimmed.startsWith('## ')) nodes.push(<h3 key={i} className="mb-1.5 mt-4 text-[15px] font-bold text-slate-900">{inlineParts(trimmed.slice(3))}</h3>);
    else if (trimmed.startsWith('# ')) nodes.push(<h2 key={i} className="mb-2 mt-4 text-base font-bold text-slate-900">{inlineParts(trimmed.slice(2))}</h2>);
    else if (trimmed.startsWith('> ')) nodes.push(<blockquote key={i} className="my-2 border-l-2 border-slate-300 pl-3 text-slate-600">{inlineParts(trimmed.slice(2))}</blockquote>);
    else if (/^---+$/.test(trimmed)) nodes.push(<hr key={i} className="my-3 border-slate-200" />);
    else nodes.push(<p key={i} className="my-1.5 whitespace-pre-wrap leading-6">{inlineParts(trimmed)}</p>);
    i += 1;
  }
  flush();
  return <div className="break-words">{nodes}</div>;
}

export const IntelligenceCopilot: React.FC<IntelligenceCopilotProps> = ({ currentUser }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<SourceDoc[]>([]);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('assistant');
  const [classification, setClassification] = useState<Classification>('INTERNAL');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [providersReady, setProvidersReady] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const activeConversationKey = `spip-copilot-active:${currentUser.id}`;

  const authedFetch = async (url: string, options: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const headers = new Headers(options.headers || {});
    if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
    return fetch(url, { ...options, headers, cache: 'no-store' });
  };

  const fetchStatus = async () => {
    try {
      const res = await authedFetch('/api/ai/status');
      if (!res.ok) return;
      const data = await res.json();
      setProvidersReady(Boolean(data?.ready));
      setProviders(Array.isArray(data?.providers) ? data.providers : []);
    } catch {
      setProvidersReady(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await authedFetch('/api/ai/conversations');
      const data = await res.json().catch(() => ({}));
      const rows = res.ok ? (Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : []) : [];
      setConversations(rows);
      return rows as Conversation[];
    } catch {
      setConversations([]);
      return [] as Conversation[];
    }
  };

  const loadConversation = async (id: string, silent = false) => {
    try {
      const res = await authedFetch(`/api/ai/conversations/${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to open this conversation.');
      const conversation = data.conversation || data;
      setConversationId(id);
      setMessages(Array.isArray(data.messages) ? data.messages : Array.isArray(conversation.messages) ? conversation.messages : []);
      if (conversation.mode && MODES.some((item) => item.id === conversation.mode)) setMode(conversation.mode);
      if (['PUBLIC','INTERNAL','CONFIDENTIAL'].includes(conversation.data_classification)) setClassification(conversation.data_classification);
      window.localStorage.setItem(activeConversationKey, id);
      setDocuments([]);
      return true;
    } catch (err: any) {
      if (!silent) setError(err.message || 'Unable to open this conversation.');
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      await fetchStatus();
      const rows = await fetchConversations();
      if (cancelled) return;
      const remembered = window.localStorage.getItem(activeConversationKey);
      const preferred = remembered && rows.some((item) => item.id === remembered) ? remembered : rows[0]?.id;
      if (preferred) await loadConversation(preferred, true);
      setHistoryLoading(false);
    })();
    return () => { cancelled = true; };
  }, [currentUser.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

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
      if (nextConversationId) {
        setConversationId(nextConversationId);
        window.localStorage.setItem(activeConversationKey, nextConversationId);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'No response was returned.', provider: data.provider, model: data.model }]);
      if (data?.persistence?.saved === false) setNotice(data?.persistence?.warning || 'This answer worked, but conversation history could not be saved.');
      await Promise.all([fetchConversations(), fetchStatus()]);
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
      if (!data.document?.id) throw new Error('The document was processed but no secure document record was returned.');
      setDocuments((prev) => [...prev.filter((item) => item.id !== data.document.id), data.document]);
      setNotice(`${file.name} is ready as source material for this conversation.`);
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
      const title = conversations.find((item) => item.id === conversationId)?.title || (mode === 'proposal' ? 'SCM Proposal Draft' : 'SCM Intelligence Draft');
      const res = await authedFetch('/api/ai/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, format, title, content: latestAssistant.content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The export could not be generated.');
      if (!data.signedUrl) throw new Error('The export was created but a secure download link was not returned.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      setNotice(`${format.toUpperCase()} export created. The secure link expires shortly.`);
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
    if (conversationId === id) startNew();
    const rows = await fetchConversations();
    if (rows[0]?.id && conversationId === id) await loadConversation(rows[0].id, true);
  };

  const configuredProviders = providers.filter((provider) => provider.configured);

  return (
    <div className="grid min-h-[calc(100vh-8.5rem)] grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        <button onClick={startNew} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b1191f] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#93151a]">
          <MessageSquarePlus className="h-4 w-4" /> New conversation
        </button>
        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Private history</div>
        <div className="space-y-1">
          {historyLoading && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Loading your conversations…</div>}
          {!historyLoading && conversations.length === 0 && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No saved conversations yet.</div>}
          {conversations.slice(0, 30).map((conversation) => (
            <div key={conversation.id} className={`group flex items-center gap-1 rounded-xl ${conversation.id === conversationId ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
              <button onClick={() => loadConversation(conversation.id)} className="min-w-0 flex-1 px-3 py-2 text-left">
                <div className="truncate text-xs font-medium text-slate-800">{conversation.title || 'Untitled conversation'}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{conversation.mode || 'assistant'}</div>
              </button>
              <button onClick={() => deleteConversation(conversation.id)} title="Delete" className="mr-1 rounded-lg p-1.5 text-slate-300 opacity-0 hover:bg-white hover:text-red-600 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-h-[720px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#091b2d] text-white"><Bot className="h-4 w-4" /></div>
              <div>
                <h2 className="text-base font-bold text-slate-900">SCM Intelligence Copilot</h2>
                <p className="text-xs text-slate-500">Research, proposals, emails, meeting briefs, analysis and secure document exports.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${providersReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                {providersReady ? 'AI router ready' : 'Provider check'}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500">Private to {currentUser.fullName}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {MODES.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => setMode(item.id)} title={item.hint} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${mode === item.id ? 'border-red-200 bg-red-50 text-[#b1191f]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={classification} onChange={(e) => setClassification(e.target.value as Classification)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal SCM</option>
              <option value="CONFIDENTIAL">Confidential</option>
            </select>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              {uploading ? <Upload className="h-3.5 w-3.5 animate-pulse" /> : <Paperclip className="h-3.5 w-3.5" />}
              {uploading ? 'Processing…' : 'Add source document'}
              <input type="file" className="hidden" accept=".docx,.xlsx,.csv,.txt,.md,.json" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadSource(file); e.currentTarget.value = ''; }} />
            </label>
            {documents.map((doc) => <span key={doc.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600">{doc.filename}</span>)}
            {configuredProviders.length > 0 && <span className="ml-auto text-[10px] text-slate-400">Router: {configuredProviders.map((provider) => provider.label).join(' → ')}</span>}
          </div>
        </header>

        {(error || notice) && (
          <div className="space-y-2 px-4 pt-3">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            {notice && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{notice}</div>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#091b2d] text-white"><Sparkles className="h-5 w-5" /></div>
              <h3 className="text-base font-bold text-slate-900">What do you need to get done?</h3>
              <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">Ask for company research, a proposal, a client email, meeting preparation, financial analysis or a document based on your uploaded source material.</p>
              <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                {[
                  'Draft a tailored institutional proposal for this prospect.',
                  'Prepare a meeting brief from the available CRM information.',
                  'Write a concise follow-up email after our last discussion.',
                  'Analyse this company and show the result in a clear table.',
                ].map((text) => <button key={text} onClick={() => setPrompt(text)} className="rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-600 hover:border-red-200 hover:bg-red-50/40">{text}</button>)}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.filter((item) => item.role !== 'system').map((message, index) => (
                <div key={message.id || `${message.role}-${index}`} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={message.role === 'user' ? 'max-w-[84%] rounded-2xl rounded-br-md bg-[#091b2d] px-4 py-3 text-sm text-white' : 'max-w-[94%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm'}>
                    {message.role === 'assistant' ? <RichMessage content={message.content} /> : <div className="whitespace-pre-wrap leading-6">{message.content}</div>}
                    {message.role === 'assistant' && message.provider && <div className="mt-3 border-t border-slate-100 pt-2 text-[9px] uppercase tracking-wide text-slate-300">SCM AI router completed this response.</div>}
                  </div>
                </div>
              ))}
              {busy && <div className="flex justify-start"><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">Copilot is working…</div></div>}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {latestAssistant && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Export latest answer</span>
            {(['docx','pdf','pptx','xlsx'] as const).map((format) => (
              <button key={format} disabled={Boolean(exporting)} onClick={() => exportDraft(format)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase text-slate-600 hover:border-red-200 hover:text-[#b1191f] disabled:opacity-50">
                <FileDown className="h-3.5 w-3.5" /> {exporting === format ? 'Creating…' : format}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-red-300">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(); } }} placeholder="Ask SCM Intelligence Copilot…" rows={2} className="max-h-36 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
            <button onClick={sendPrompt} disabled={busy || !prompt.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b1191f] text-white hover:bg-[#93151a] disabled:cursor-not-allowed disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">AI drafts require employee review before external use. Private conversation history is isolated by employee account.</div>
        </div>
      </section>
    </div>
  );
};
