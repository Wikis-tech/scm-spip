import fs from 'node:fs';

const path = 'src/server/phase6AiRuntime.ts';
let s = fs.readFileSync(path, 'utf8');

s = s.replace("model: process.env.CLOUDFLARE_MODEL?.trim() || '@cf/openai/gpt-oss-120b'", "model: process.env.CLOUDFLARE_MODEL?.trim() || '@cf/openai/gpt-oss-20b'");
s = s.replace("String(process.env.AI_PROVIDER_ORDER || 'groq,cerebras,openrouter,cloudflare,deepseek,zai')", "String(process.env.AI_PROVIDER_ORDER || 'groq,cerebras,cloudflare,openrouter,deepseek,zai')");
s = s.replace("  if (health.status === 'DISABLED') return false;", "  // Recover providers disabled by older Phase 6 builds. Invalid credentials/model errors are now\n  // handled with cooldowns instead of permanent disablement, so a corrected key/model can recover.\n  if (health.status === 'DISABLED') return true;");
s = s.replace(`      // Invalid credentials/configuration should not be retried as a quota failure.\n      if (status === 400 || status === 401 || status === 403 || status === 404) {\n        await markProviderFailure(supabase, provider.id, code, 0, true);\n      } else {\n        const cooldown = status === 429 ? Number(error?.retryAfterMs || 300_000) : Math.min(30 * 60_000, 90_000 * (1 + errors.length));\n        await markProviderFailure(supabase, provider.id, code, cooldown, false);\n      }`, `      const safeMessage = String(error?.message || '').replace(/Bearer\\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]').slice(0, 220);\n      console.warn('[PHASE6 PROVIDER FAILURE]', provider.id, code, safeMessage);\n\n      // Never permanently disable a configured provider. A key/model can be corrected in Vercel\n      // without touching the database, and the router must automatically recover afterwards.\n      const cooldown = status === 429\n        ? Number(error?.retryAfterMs || 300_000)\n        : (status === 401 || status === 403)\n          ? 30 * 60_000\n          : (status === 400 || status === 404)\n            ? 10 * 60_000\n            : Math.min(30 * 60_000, 90_000 * (1 + errors.length));\n      await markProviderFailure(supabase, provider.id, code, cooldown, false);`);

if (!s.includes("[PHASE6 PROVIDER FAILURE]")) throw new Error('Provider failure patch did not apply');
fs.writeFileSync(path, s);

const envPath = '.env.example';
let e = fs.readFileSync(envPath, 'utf8');
if (!e.includes('CLOUDFLARE_API_TOKEN=')) {
  e = e.replace('OPENROUTER_MODEL=openrouter/free\n', 'OPENROUTER_MODEL=openrouter/free\nOPENROUTER_CONFIDENTIAL_ALLOWED=false\n\nCLOUDFLARE_ACCOUNT_ID=\nCLOUDFLARE_API_TOKEN=\nCLOUDFLARE_MODEL=@cf/openai/gpt-oss-20b\nCLOUDFLARE_CONFIDENTIAL_ALLOWED=false\n');
}
e = e.replace('AI_PROVIDER_ORDER=groq,cerebras,openrouter,cloudflare,deepseek,zai', 'AI_PROVIDER_ORDER=groq,cerebras,cloudflare,openrouter,deepseek,zai');
fs.writeFileSync(envPath, e);
