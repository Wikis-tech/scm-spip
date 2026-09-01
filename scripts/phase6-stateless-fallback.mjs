import fs from 'node:fs';

const path = 'src/server/phase6AiRuntime.ts';
let s = fs.readFileSync(path, 'utf8');

function mustReplace(label, regex, replacement) {
  const before = s;
  s = s.replace(regex, replacement);
  if (s === before) throw new Error(`${label} target not found`);
}

mustReplace(
  'createConversation failure',
  /if \(error \|\| !data\) throw new Error\('Phase 6 database migration is required before AI conversations can be saved\.'\);/,
  `if (error || !data) {\n    // Conversation persistence must never take the Copilot itself offline. The user can\n    // still receive a secure stateless answer while the persistence layer is repaired.\n    const code = String(error?.code || 'UNKNOWN').slice(0, 80);\n    const message = String(error?.message || 'AI conversation persistence unavailable')\n      .replace(/Bearer\\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')\n      .slice(0, 240);\n    console.error('[PHASE6 PERSISTENCE ERROR] createConversation', code, message);\n    return null;\n  }`,
);

mustReplace(
  'user message insert',
  /\s{4}await phase6Supabase\.from\('spip_ai_messages'\)\.insert\(\{\s*conversation_id: conversationId,\s*user_id: identity\.id,\s*role: 'user',\s*content: query,\s*\}\);/m,
  `\n    if (conversationId) {\n      const { error: userMessageError } = await phase6Supabase.from('spip_ai_messages').insert({\n        conversation_id: conversationId,\n        user_id: identity.id,\n        role: 'user',\n        content: query,\n      });\n      if (userMessageError) {\n        console.error('[PHASE6 PERSISTENCE ERROR] userMessage', String(userMessageError.code || 'UNKNOWN').slice(0, 80), String(userMessageError.message || '').slice(0, 240));\n      }\n    }`,
);

mustReplace(
  'assistant message insert',
  /\s{4}await phase6Supabase\.from\('spip_ai_messages'\)\.insert\(\{\s*conversation_id: conversationId,\s*user_id: identity\.id,\s*role: 'assistant',\s*content: result\.text,\s*provider: result\.provider,\s*model: result\.model,\s*citations: result\.citations,\s*input_tokens: result\.inputTokens,\s*output_tokens: result\.outputTokens,\s*latency_ms: result\.latencyMs,\s*\}\);\s*await phase6Supabase\.from\('spip_ai_conversations'\)\.update\(\{ updated_at: new Date\(\)\.toISOString\(\) \}\)\.eq\('id', conversationId\)\.eq\('user_id', identity\.id\);/m,
  `\n    if (conversationId) {\n      const { error: assistantMessageError } = await phase6Supabase.from('spip_ai_messages').insert({\n        conversation_id: conversationId,\n        user_id: identity.id,\n        role: 'assistant',\n        content: result.text,\n        provider: result.provider,\n        model: result.model,\n        citations: result.citations,\n        input_tokens: result.inputTokens,\n        output_tokens: result.outputTokens,\n        latency_ms: result.latencyMs,\n      });\n      if (assistantMessageError) {\n        console.error('[PHASE6 PERSISTENCE ERROR] assistantMessage', String(assistantMessageError.code || 'UNKNOWN').slice(0, 80), String(assistantMessageError.message || '').slice(0, 240));\n      }\n      await phase6Supabase.from('spip_ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId).eq('user_id', identity.id);\n    }`,
);

mustReplace(
  'response persistence flag',
  /(usage: \{ inputTokens: result\.inputTokens, outputTokens: result\.outputTokens, latencyMs: result\.latencyMs \},)/,
  `$1\n        persistence: conversationId ? 'saved' : 'stateless',`,
);

const listStart = s.indexOf('export async function listUserConversations');
if (listStart < 0) throw new Error('listUserConversations not found');
const listEnd = s.indexOf('export async function getUserConversation', listStart);
if (listEnd < 0) throw new Error('getUserConversation boundary not found');
let listBlock = s.slice(listStart, listEnd);
const oldListBlock = listBlock;
listBlock = listBlock.replace(
  /if \(error\) throw error;\s*return data \|\| \[\];/,
  `if (error) {\n    console.error('[PHASE6 PERSISTENCE ERROR] listConversations', String(error.code || 'UNKNOWN').slice(0, 80), String(error.message || '').slice(0, 240));\n    // Empty private history is safer than taking the entire Copilot offline.\n    return [];\n  }\n  return data || [];`,
);
if (listBlock === oldListBlock) throw new Error('list conversations error target not found');
s = s.slice(0, listStart) + listBlock + s.slice(listEnd);

if (!s.includes("persistence: conversationId ? 'saved' : 'stateless'")) throw new Error('persistence response flag missing');
if (!s.includes('[PHASE6 PERSISTENCE ERROR] createConversation')) throw new Error('persistence logging missing');

fs.writeFileSync(path, s);
console.log('Phase 6 stateless fallback patch applied.');
