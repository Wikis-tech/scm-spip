# SPIP Phase 1 - Security & Supabase Auth

## Scope
Phase 1 changes authentication, identity, authorization foundations, secrets handling, and database access controls only. CRM, Apollo, Serena/Gemini, reminders, charts, and visual redesign remain out of scope until their scheduled phases.

## Confirmed legacy risks
1. `server.ts` contains hard-coded seeded users and a shared plaintext default password.
2. Request identity can be derived from `x-user-id`, `x-user-role`, `x-user-email`, query parameters, or request bodies.
3. Administrator status is partly inferred from hard-coded email addresses and role strings.
4. `ensureValidUser()` can auto-provision an approved user and has identity fallbacks when persistence fails.
5. Multiple CRM read helpers fall back to in-memory arrays after database errors.
6. `App.tsx` persists a custom user object in localStorage and sends custom identity/role headers.
7. The existing login/register/verification/reset flows are custom rather than Supabase Auth sessions.

These behaviors are acceptable only as prototype scaffolding and must not be relied upon in production.

## Target identity model
- `SUPER_ADMIN`: system/security/integration administration.
- `HOD_ADMIN`: Asset Management oversight and staff administration, without raw secret management.
- `STAFF`: normal operational access.
- Job title remains profile metadata, not an authorization role.
- Only `@scmcapitalng.com` accounts are accepted.
- New registrations start `PENDING` and cannot use operational SPIP data until approved.

## Target request model
Browser -> Supabase Auth -> signed access token -> `Authorization: Bearer <token>` -> server validates token -> server reads `profiles` -> authorization decision.

The browser is never authoritative for role, status, user ID, or administrator access.

## Deployment gates
Do not merge Phase 1 to `main` or treat the deployment as production-ready until:
- SCM Supabase migration is applied successfully.
- New administrator auth users are created with rotated passwords.
- Both admin profile permission levels are set correctly.
- Required Vercel environment variables are configured.
- Legacy custom auth endpoints and custom identity headers have been replaced.
- Protected endpoints reject missing, expired, forged, and non-SCM sessions.
- Pending/suspended users cannot access operational data.
- Existing CRM functions pass regression tests.

## Secret handling
`.env*` is ignored by Git except `.env.example`. Never commit database passwords, Supabase secret/service-role keys, Apollo keys, Groq/Gemini keys, SMTP credentials, Microsoft credentials, OneSignal REST keys, or VAPID private keys.

Any credential previously committed to a public repository should be rotated before production use.
