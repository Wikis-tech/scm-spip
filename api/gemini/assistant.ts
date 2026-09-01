import { runPhase6Assistant } from '../../src/server/phase6AiRuntime.js';

/**
 * Phase 6 provider guard.
 *
 * Groq free-tier TPM is calculated against the requested completion budget as
 * well as prompt tokens. The original Phase 6 runtime requested 6,000 output
 * tokens for every request, including a one-word chat. That made ordinary
 * Copilot prompts hit Groq's 8K TPM free-tier ceiling unnecessarily.
 *
 * This wrapper is installed once per serverless instance and only touches
 * OpenAI-compatible AI-provider requests. It:
 *   1. caps completion output to a practical enterprise-chat budget;
 *   2. retries Groq GPT-OSS 120B on the independent GPT-OSS 20B model when
 *      the 120B model is rate-limited;
 *   3. leaves authentication, persistence and provider keys server-side.
 */
const installProviderFetchGuard = () => {
  const marker = '__spipPhase6ProviderFetchGuardInstalled';
  const globalScope = globalThis as typeof globalThis & Record<string, any>;
  if (globalScope[marker]) return;

  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String(input?.url || input || '');
    const isAiProvider =
      url.includes('api.groq.com/openai/') ||
      url.includes('api.cerebras.ai/') ||
      url.includes('openrouter.ai/api/') ||
      url.includes('api.cloudflare.com/client/v4/accounts/');

    if (!isAiProvider || !init?.body || typeof init.body !== 'string') {
      return nativeFetch(input, init);
    }

    let body: any;
    try {
      body = JSON.parse(init.body);
    } catch {
      return nativeFetch(input, init);
    }

    // 1,600 tokens is enough for normal enterprise answers and materially
    // reduces free-tier TPM pressure. Longer document generation is rendered
    // from structured Copilot content rather than asking for 6K every turn.
    const configuredBudget = Number(process.env.AI_MAX_COMPLETION_TOKENS || 1600);
    const completionBudget = Number.isFinite(configuredBudget)
      ? Math.max(400, Math.min(3000, configuredBudget))
      : 1600;

    body.max_tokens = Math.min(Number(body.max_tokens || completionBudget), completionBudget);

    const guardedInit: RequestInit = {
      ...init,
      body: JSON.stringify(body),
    };

    let response = await nativeFetch(input, guardedInit);

    // Groq rate limits are model-specific. If the large model is temporarily
    // exhausted, immediately try GPT-OSS 20B using the same private API key
    // before falling through to Cerebras / Cloudflare / OpenRouter.
    if (
      response.status === 429 &&
      url.includes('api.groq.com/openai/') &&
      body.model === 'openai/gpt-oss-120b'
    ) {
      const fastBody = {
        ...body,
        model: 'openai/gpt-oss-20b',
        max_tokens: Math.min(body.max_tokens, 1200),
      };
      response = await nativeFetch(input, {
        ...init,
        body: JSON.stringify(fastBody),
      });
    }

    return response;
  }) as typeof fetch;

  globalScope[marker] = true;
};

installProviderFetchGuard();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const result = await runPhase6Assistant(req);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(result.status).json(result.body);
}
