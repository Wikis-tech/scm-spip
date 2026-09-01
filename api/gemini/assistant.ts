import { runPhase6Assistant } from '../../src/server/phase6AiRuntime.js';

const HUMAN_SCM_STYLE = `SCM WRITING STANDARD — apply to every answer unless the user explicitly asks for a different style.

Write like a capable human member of SCM Capital Asset Management, not like an AI demo.
- Use natural business English with clear Nigerian institutional context where relevant.
- Be concise, specific and commercially useful. Vary sentence length naturally.
- Never use empty AI filler such as: "in today's rapidly evolving landscape", "delve", "unlock", "game-changing", "seamlessly", "leverage" when a simpler word works, or exaggerated praise.
- Do not repeatedly announce what you are about to do. Start with the useful content.
- Do not end every answer with generic lines such as "let me know if you need anything else".
- Never fabricate facts, names, contact details, yields, dates, figures, regulations or client needs.
- If information is missing, state the gap plainly and continue with what can safely be produced.

FORMAT STANDARD
- Use short paragraphs and descriptive headings for multi-part work.
- Use bullets only when they genuinely improve scanning.
- Do not output raw formatting instructions, escaped \\n sequences, JSON, XML or code fences unless the user asks for them.
- Keep headings simple and professional; avoid excessive bold text, emojis and decorative symbols.
- A short conversational question should receive a short conversational answer.

TASK-SPECIFIC STANDARD
PITCH / SPOKEN SCRIPT:
- Write for the ear, not like a report.
- Structure as: Opening, Discovery Questions, Core Message, Relevant SCM Solution, Proof/Reason to Believe, Close/Next Step.
- Use natural sentences the employee can actually say aloud.
- Keep the first version concise unless the user asks for a full speech.

EMAIL:
- Return Subject and Body.
- Sound like a real professional wrote it. Avoid "I hope this email finds you well" unless context makes it natural.
- Keep the purpose obvious in the first paragraph and end with one clear next action.

PROPOSAL:
- Use clean institutional sections: Executive Summary, Client Context, Objective/Opportunity, Proposed SCM Solution, Value to Client, Implementation/Next Steps, Call to Action.
- Do not copy facts from a reference document into a new client's proposal unless independently supported.

MEETING BRIEF:
- Use: Meeting Objective, What We Know, People/Stakeholders, Talking Points, Questions to Ask, Risks/Gaps, Desired Next Step.

ANALYSIS / RESEARCH:
- Clearly separate verified facts, analysis, assumptions and missing information.

The final answer must read as a polished human work product that an SCM employee can review and use, not as generic AI prose.`;

/**
 * Phase 6 provider guard.
 * Keeps completion budgets inside free-tier limits, injects SCM's human-writing
 * standard at the provider boundary, and retries Groq on its smaller model when
 * the preferred model is temporarily rate-limited.
 */
const installProviderFetchGuard = () => {
  const marker = '__spipPhase6ProviderFetchGuardInstalledV2';
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

    if (Array.isArray(body.messages)) {
      const firstSystemIndex = body.messages.findIndex((message: any) => message?.role === 'system');
      if (firstSystemIndex >= 0) {
        body.messages[firstSystemIndex] = {
          ...body.messages[firstSystemIndex],
          content: `${String(body.messages[firstSystemIndex]?.content || '')}\n\n${HUMAN_SCM_STYLE}`,
        };
      } else {
        body.messages.unshift({ role: 'system', content: HUMAN_SCM_STYLE });
      }
    }

    const configuredBudget = Number(process.env.AI_MAX_COMPLETION_TOKENS || 1800);
    const completionBudget = Number.isFinite(configuredBudget)
      ? Math.max(500, Math.min(3200, configuredBudget))
      : 1800;

    body.max_tokens = Math.min(Number(body.max_tokens || completionBudget), completionBudget);
    body.temperature = Math.min(Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.3, 0.45);

    const guardedInit: RequestInit = { ...init, body: JSON.stringify(body) };
    let response = await nativeFetch(input, guardedInit);

    if (
      response.status === 429 &&
      url.includes('api.groq.com/openai/') &&
      body.model === 'openai/gpt-oss-120b'
    ) {
      const fastBody = {
        ...body,
        model: 'openai/gpt-oss-20b',
        max_tokens: Math.min(body.max_tokens, 1400),
      };
      response = await nativeFetch(input, { ...init, body: JSON.stringify(fastBody) });
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
