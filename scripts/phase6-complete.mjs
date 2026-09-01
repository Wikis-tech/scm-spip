import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, value) => fs.writeFileSync(path, value);
const requireIncludes = (value, needle, label) => {
  if (!value.includes(needle)) throw new Error(`Phase 6 patch failed: ${label} marker not found.`);
};

// 1) Provider router: respect configured order and make OpenRouter the optional third fallback.
{
  const path = 'src/server/phase6AiRuntime.ts';
  let source = read(path);
  const start = source.indexOf('function providers(): ProviderConfig[] {');
  const end = source.indexOf('\nfunction researchProvider()', start);
  if (start < 0 || end < 0) throw new Error('Provider registry block not found.');
  const replacement = `function providers(): ProviderConfig[] {
  const registry: Record<string, ProviderConfig> = {
    groq: {
      id: 'groq', label: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY?.trim(), model: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b',
      confidentialAllowed: process.env.GROQ_CONFIDENTIAL_ALLOWED === 'true', priority: 10,
    },
    cerebras: {
      id: 'cerebras', label: 'Cerebras', endpoint: 'https://api.cerebras.ai/v1/chat/completions',
      apiKey: process.env.CEREBRAS_API_KEY?.trim(), model: process.env.CEREBRAS_MODEL?.trim() || 'gpt-oss-120b',
      confidentialAllowed: process.env.CEREBRAS_CONFIDENTIAL_ALLOWED === 'true', priority: 20,
    },
    openrouter: {
      id: 'openrouter', label: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: process.env.OPENROUTER_API_KEY?.trim(), model: process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free',
      confidentialAllowed: false, priority: 30,
    },
    deepseek: {
      id: 'deepseek', label: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY?.trim(), model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat',
      confidentialAllowed: process.env.DEEPSEEK_CONFIDENTIAL_ALLOWED === 'true', priority: 40,
    },
    zai: {
      id: 'zai', label: 'Z.ai', endpoint: 'https://api.z.ai/api/paas/v4/chat/completions',
      apiKey: process.env.ZAI_API_KEY?.trim(), model: process.env.ZAI_MODEL?.trim() || 'glm-4.7-flash',
      confidentialAllowed: process.env.ZAI_CONFIDENTIAL_ALLOWED === 'true', priority: 50,
    },
  };
  const requested = String(process.env.AI_PROVIDER_ORDER || 'groq,cerebras,openrouter,deepseek,zai')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  const ordered: ProviderConfig[] = [];
  for (const id of requested) {
    const item = registry[id];
    if (item && !seen.has(id)) { ordered.push(item); seen.add(id); }
  }
  for (const item of Object.values(registry).sort((a, b) => a.priority - b.priority)) {
    if (!seen.has(item.id)) ordered.push(item);
  }
  return ordered.map((item, index) => ({ ...item, priority: index + 1 }));
}
`;
  source = source.slice(0, start) + replacement + source.slice(end);

  // Add owner-scoped source document context.
  const workspaceMarker = '\nfunction modeInstructions(mode: AiMode): string {';
  requireIncludes(source, workspaceMarker, 'mode instructions');
  const documentFn = `
async function documentContext(supabase: SupabaseClient, identity: ActiveIdentity, documentIds: string[]) {
  const safeIds = [...new Set(documentIds.filter((value) => /^[0-9a-f-]{36}$/i.test(value)))].slice(0, 6);
  if (!safeIds.length) return '';
  const { data, error } = await supabase
    .from('spip_ai_documents')
    .select('id, filename, extracted_text, extraction_status')
    .eq('user_id', identity.id)
    .in('id', safeIds)
    .eq('extraction_status', 'READY');
  if (error) throw new Error('One or more source documents could not be loaded.');
  return (data || [])
    .map((doc: any) => `SOURCE DOCUMENT: ${doc.filename}\n${String(doc.extracted_text || '').slice(0, 30000)}`)
    .join('\n\n')
    .slice(0, MAX_CONTEXT_CHARS);
}
`;
  source = source.replace(workspaceMarker, `${documentFn}${workspaceMarker}`);

  const idMarker = "  const existingConversationId = req.body?.conversationId ? String(req.body.conversationId) : null;";
  requireIncludes(source, idMarker, 'conversation request shape');
  source = source.replace(idMarker, `${idMarker}\n  const documentIds = Array.isArray(req.body?.documentIds) ? req.body.documentIds.map(String) : [];`);

  const promiseBlock = `    const [workspace, saved] = await Promise.all([\n      workspaceContext(phase6Supabase, identity, workspaceId),\n      getConversationHistory(phase6Supabase, identity, existingConversationId),\n    ]);`;
  requireIncludes(source, promiseBlock, 'context Promise.all');
  source = source.replace(promiseBlock, `    const [workspace, saved, sourceDocuments] = await Promise.all([\n      workspaceContext(phase6Supabase, identity, workspaceId),\n      getConversationHistory(phase6Supabase, identity, existingConversationId),\n      documentContext(phase6Supabase, identity, documentIds),\n    ]);`);

  const promptLine = "      { role: 'system', content: systemPrompt(identity, effectiveMode, classification, workspace.text) },";
  requireIncludes(source, promptLine, 'system prompt');
  source = source.replace(promptLine, "      { role: 'system', content: systemPrompt(identity, effectiveMode, classification, [workspace.text, sourceDocuments].filter(Boolean).join('\\n\\n')) },");

  write(path, source);
}

// 2) App navigation: add the dedicated Copilot screen without disturbing existing Research/Workspaces.
{
  const path = 'src/App.tsx';
  let source = read(path);
  const importMarker = "import { Workspaces } from './pages/Workspaces';";
  requireIncludes(source, importMarker, 'App Workspaces import');
  if (!source.includes("./pages/IntelligenceCopilot")) {
    source = source.replace(importMarker, `${importMarker}\nimport { IntelligenceCopilot } from './pages/IntelligenceCopilot';`);
  }
  const caseMarker = "      case 'intelligence':\n        return (";
  requireIncludes(source, caseMarker, 'App intelligence case');
  if (!source.includes("case 'copilot':")) {
    source = source.replace(caseMarker, `      case 'copilot':\n        return <IntelligenceCopilot currentUser={currentUser} />;\n      case 'intelligence':\n        return (`);
  }
  write(path, source);
}

// 3) Sidebar: add a single Copilot navigation item to the workspace section.
{
  const path = 'src/components/Sidebar.tsx';
  let source = read(path);
  source = source.replace('  Award,\n}', '  Award,\n  Bot,\n}');
  const marker = "  { id: 'intelligence', label: 'Research', icon: SearchCode, activeFor: ['intelligence', 'workspaces'] },";
  requireIncludes(source, marker, 'Sidebar Research item');
  if (!source.includes("id: 'copilot'")) source = source.replace(marker, `${marker}\n  { id: 'copilot', label: 'Intelligence Copilot', icon: Bot },`);
  write(path, source);
}

// 4) Remove remaining user-facing Serena/Gemini branding from the workspace AI panel while retaining compatibility identifiers.
{
  const path = 'src/pages/Workspaces.tsx';
  let source = read(path);
  const replacements = [
    ['SERENA AI', 'SCM INTELLIGENCE COPILOT'],
    ['Serena AI', 'SCM Intelligence Copilot'],
    ['Serena V2', 'SCM Intelligence Copilot'],
    ['Ask Serena', 'Ask Copilot'],
    ['Serena Consultation', 'Copilot Consultation'],
    ['Error calling Serena backend:', 'Copilot request failed:'],
    ['No response received.', 'No response was returned.'],
    ["modelUsed: 'gemini-3.5-flash'", "modelUsed: 'phase6-provider-router'"],
  ];
  for (const [from, to] of replacements) source = source.split(from).join(to);
  write(path, source);
}

// 5) Update environment defaults: Z.ai becomes optional last-resort; OpenRouter is the optional third provider.
{
  const path = '.env.example';
  let source = read(path);
  source = source.replace(/AI_PROVIDER_ORDER=.*$/m, 'AI_PROVIDER_ORDER=groq,cerebras,openrouter,deepseek,zai');
  source = source.replace(/GROQ_MODEL=.*$/m, 'GROQ_MODEL=openai/gpt-oss-120b');
  write(path, source);
}

console.log('Phase 6 completion patch applied.');
