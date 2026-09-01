import fs from 'node:fs';

const path = 'src/server/phase6AiRuntime.ts';
let s = fs.readFileSync(path, 'utf8');

const target = "    throw new Error(`Conversation history is temporarily unavailable (${safeCode}).`);";
const replacement = `    // Do not take Copilot inference offline just because history persistence is unavailable.\n    // The response remains user-scoped and is returned without saved history for this turn.\n    return null;`;

if (!s.includes(target)) throw new Error('current createConversation persistence throw not found');
s = s.replace(target, replacement);
fs.writeFileSync(path, s);
console.log('Phase 6 persistence guard patched for stateless fallback.');
