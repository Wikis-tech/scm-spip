# Phase 6 - SCM Intelligence Copilot

## Objective
Replace the legacy Serena/Gemini-only assistant with a private, resilient, multi-provider enterprise AI layer. Existing CRM, Apollo, Workspaces, Phase 4 reminders and the pending Phase 5 Microsoft 365 integration remain intact.

## Core guarantees
- Each employee owns their own AI conversations and messages.
- Administrators do not automatically receive access to staff prompt/message content.
- Workspace context is owner-scoped.
- Browser clients never receive provider API keys.
- Provider failures and quota resets are handled through a server-side circuit breaker.
- 429, timeout and 5xx failures fall through to the next approved provider.
- Expired cooldowns automatically make a preferred provider eligible again.
- 400/401/403/404 provider errors are treated as configuration problems rather than quota errors.
- CONFIDENTIAL prompts only use providers explicitly approved with `*_CONFIDENTIAL_ALLOWED=true`.
- No generated contact details, revenue, addresses, yields or other factual values may be presented as verified facts.

## Provider order
Default order is configurable but starts as:
1. Groq - `qwen/qwen3.8-27b`
2. Cerebras - `gpt-oss-120b`
3. Z.ai - `glm-4.7-flash`
4. DeepSeek - optional paid fallback
5. OpenRouter free router - optional PUBLIC-data emergency fallback only

Research mode may place Groq Compound first only when `GROQ_COMPOUND_ENABLED=true`. Compound/search can incur usage charges and should not be described as unlimited-free research.

## Required keys
At least one provider key is required for live AI testing. For a resilient free/low-cost chain, configure:
- `GROQ_API_KEY`
- `CEREBRAS_API_KEY`
- `ZAI_API_KEY`

Optional:
- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`

Do not put any of these in a `VITE_` variable.

## Groq data controls
Before allowing confidential prompts through Groq, SCM should review Groq Data Controls and enable Zero Data Retention if approved. Only then set `GROQ_CONFIDENTIAL_ALLOWED=true`.

## Conversation model
Phase 6 adds:
- `spip_ai_conversations`
- `spip_ai_messages`
- `spip_ai_documents`
- `spip_ai_artifacts`
- `spip_ai_provider_health`
- `spip_ai_usage_events`
- private bucket `spip-ai-private`

Run `database/migrations/phase_6_ai_orchestration.sql` in Supabase before live testing.

## Compatibility
The existing Workspace UI calls `/api/gemini/assistant`. Phase 6 deliberately adds a more-specific Vercel route at that exact path so existing UI can be upgraded without breaking the current workspace. The response still contains `reply`, while also returning `conversationId`, provider, model, citations, classification and usage metadata.

## Modes
- assistant
- research
- proposal
- email
- meeting
- followup
- analysis

The runtime uses SCM-specific enterprise drafting rules. Missing facts must remain missing rather than being guessed.

## Phase 6B artifact pipeline
The next Phase 6 increment should render approved structured drafts into:
- PDF
- DOCX
- PPTX
- XLSX

Recommended implementation rule: the LLM produces a structured document specification first. Deterministic renderers create the file from that spec. The model should never directly construct Office/PDF binary formats.

Source-document support should accept existing SCM proposal examples, extract their text/structure, store them in the private AI bucket, and use only documents owned by the signed-in employee or explicitly shared through a future audited sharing feature.

## Acceptance tests
1. Unauthenticated `/api/gemini/assistant` returns 401.
2. Staff A creates a conversation and can reopen it.
3. Staff B cannot fetch, continue or delete Staff A's conversation by ID.
4. Admin cannot fetch Staff A's private AI conversation solely because they are admin.
5. A configured provider returns a response and provider/model metadata.
6. Simulated/real 429 places the provider into cooldown and uses the next provider.
7. After cooldown expiry the preferred provider becomes eligible again.
8. Invalid provider key disables only that provider and does not break the remaining chain.
9. CONFIDENTIAL mode fails closed if no provider is explicitly approved.
10. Workspace context cannot be loaded for a workspace owned by another employee.
11. Existing Prospects, Research, Calendar, Phase 4 notifications and login continue working unchanged.
12. No AI provider key is present in browser bundles or API responses.
13. Production build and TypeScript checks pass.
14. Dependency audit contains no high/critical advisory.

## Phase 6B inputs needed from SCM
To make generated files look like SCM work rather than generic AI documents, supply approved examples/templates where available:
- one or more previous SCM proposals (DOCX/PDF)
- approved PowerPoint pitch template
- Word letter/proposal template
- current SCM logo/brand rules
- standard footer/contact details
- legal/compliance disclaimers
- current product descriptions/factsheets that AI may quote

Templates remain source material; facts must not be silently copied from an old client proposal into a new client proposal.
