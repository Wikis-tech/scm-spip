import fs from 'node:fs';

const path = 'src/server/phase6AiRuntime.ts';
let s = fs.readFileSync(path, 'utf8');

const originalCreate = `  const { data, error } = await supabase.from('spip_ai_conversations').insert({
    user_id: identity.id,
    workspace_id: workspaceId || null,
    title,
    mode,
    data_classification: classification,
  }).select('id').single();
  if (error || !data) throw new Error('Phase 6 database migration is required before AI conversations can be saved.');
  return data.id as string;
}`;

const patchedCreate = `  const { data, error } = await supabase.from('spip_ai_conversations').insert({
    user_id: identity.id,
    workspace_id: workspaceId || null,
    title,
    mode,
    data_classification: classification,
  }).select('id').single();
  if (error || !data) {
    // Conversation persistence must never take the Copilot itself offline. The user can
    // still receive a secure stateless answer while the persistence layer is repaired.
    const code = String(error?.code || 'UNKNOWN').slice(0, 80);
    const message = String(error?.message || 'AI conversation persistence unavailable')
      .replace(/Bearer\\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      .slice(0, 240);
    console.error('[PHASE6 PERSISTENCE ERROR] createConversation', code, message);
    return null;
  }
  return data.id as string;
}`;

if (!s.includes(originalCreate)) throw new Error('createConversation target not found');
s = s.replace(originalCreate, patchedCreate);

const originalUserInsert = `    await phase6Supabase.from('spip_ai_messages').insert({
      conversation_id: conversationId,
      user_id: identity.id,
      role: 'user',
      content: query,
    });`;

const patchedUserInsert = `    if (conversationId) {
      const { error: userMessageError } = await phase6Supabase.from('spip_ai_messages').insert({
        conversation_id: conversationId,
        user_id: identity.id,
        role: 'user',
        content: query,
      });
      if (userMessageError) {
        console.error('[PHASE6 PERSISTENCE ERROR] userMessage', String(userMessageError.code || 'UNKNOWN').slice(0, 80), String(userMessageError.message || '').slice(0, 240));
      }
    }`;

if (!s.includes(originalUserInsert)) throw new Error('user message insert target not found');
s = s.replace(originalUserInsert, patchedUserInsert);

const originalAssistantInsert = `    await phase6Supabase.from('spip_ai_messages').insert({
      conversation_id: conversationId,
      user_id: identity.id,
      role: 'assistant',
      content: result.text,
      provider: result.provider,
      model: result.model,
      citations: result.citations,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      latency_ms: result.latencyMs,
    });
    await phase6Supabase.from('spip_ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId).eq('user_id', identity.id);`;

const patchedAssistantInsert = `    if (conversationId) {
      const { error: assistantMessageError } = await phase6Supabase.from('spip_ai_messages').insert({
        conversation_id: conversationId,
        user_id: identity.id,
        role: 'assistant',
        content: result.text,
        provider: result.provider,
        model: result.model,
        citations: result.citations,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        latency_ms: result.latencyMs,
      });
      if (assistantMessageError) {
        console.error('[PHASE6 PERSISTENCE ERROR] assistantMessage', String(assistantMessageError.code || 'UNKNOWN').slice(0, 80), String(assistantMessageError.message || '').slice(0, 240));
      }
      await phase6Supabase.from('spip_ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId).eq('user_id', identity.id);
    }`;

if (!s.includes(originalAssistantInsert)) throw new Error('assistant message insert target not found');
s = s.replace(originalAssistantInsert, patchedAssistantInsert);

const responseAnchor = `        usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens, latencyMs: result.latencyMs },`;
if (!s.includes(responseAnchor)) throw new Error('response anchor not found');
s = s.replace(responseAnchor, `${responseAnchor}\n        persistence: conversationId ? 'saved' : 'stateless',`);

const listOriginal = `  if (error) throw error;
  return data || [];
}`;
const listPatched = `  if (error) {
    console.error('[PHASE6 PERSISTENCE ERROR] listConversations', String(error.code || 'UNKNOWN').slice(0, 80), String(error.message || '').slice(0, 240));
    // Empty private history is safer than taking the entire Copilot offline.
    return [];
  }
  return data || [];
}`;

const listStart = s.indexOf('export async function listUserConversations');
if (listStart < 0) throw new Error('listUserConversations not found');
const beforeList = s.slice(0, listStart);
let listTail = s.slice(listStart);
if (!listTail.includes(listOriginal)) throw new Error('list conversation error target not found');
listTail = listTail.replace(listOriginal, listPatched);
s = beforeList + listTail;

if (!s.includes("persistence: conversationId ? 'saved' : 'stateless'")) throw new Error('persistence response flag missing');
if (!s.includes('[PHASE6 PERSISTENCE ERROR] createConversation')) throw new Error('persistence logging missing');

fs.writeFileSync(path, s);
console.log('Phase 6 stateless fallback patch applied.');
