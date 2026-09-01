import fs from 'node:fs';

const path = 'src/server/phase6AiRuntime.ts';
let s = fs.readFileSync(path, 'utf8');

const literalTarget = '    throw new Error(`Conversation history is temporarily unavailable (${safeCode}).`);';
const replacement = `    // Do not take Copilot inference offline just because history persistence is unavailable.
    // The response remains user-scoped and is returned without saved history for this turn.
    return null;`;

if (s.includes(literalTarget)) {
  s = s.replace(literalTarget, replacement);
} else if (!s.includes('Do not take Copilot inference offline just because history persistence is unavailable.')) {
  throw new Error('current createConversation persistence throw not found');
}

fs.writeFileSync(path, s);
console.log('Phase 6 persistence guard patched for stateless fallback.');
