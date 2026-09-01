import fs from 'node:fs';

const path = 'src/server/phase6AiRuntime.ts';
let s = fs.readFileSync(path, 'utf8');

const target = "  if (error || !data) throw new Error('Phase 6 database migration is required before AI conversations can be saved.');";
const replacement = `  if (error || !data) {
    const code = String(error?.code || 'UNKNOWN').slice(0, 80);
    const message = String(error?.message || 'AI conversation persistence unavailable')
      .replace(/Bearer\\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      .slice(0, 240);
    console.error('[PHASE6 PERSISTENCE ERROR] createConversation', code, message);
    return null;
  }`;

if (!s.includes(target)) throw new Error('createConversation persistence guard target not found');
s = s.replace(target, replacement);
fs.writeFileSync(path, s);
console.log('Phase 6 persistence guard patched.');
