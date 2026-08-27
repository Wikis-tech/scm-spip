# SPIP Phase 1 Security

Phase 1 replaces the legacy application-managed credential model with Supabase Auth and establishes fail-closed production behavior.

## Authentication
- Supabase Auth is the identity provider.
- Only `@scmcapitalng.com` accounts are accepted.
- New users are created as `STAFF` + `PENDING`.
- Only `ACTIVE` profiles can use protected SPIP APIs.
- API requests use a Supabase bearer token; browser-supplied role/user headers are not trusted.
- Supabase persists/refreshes the browser session; SPIP no longer treats a localStorage profile as authentication authority.

## Permissions
- `SUPER_ADMIN`: full platform administration.
- `HOD_ADMIN`: Asset Management administration without super-admin promotion rights.
- `STAFF`: normal operational access.

## Passwords
- Passwords exist only inside Supabase Auth.
- Legacy plaintext password storage and seeded/default passwords are removed.
- Administrators cannot set a staff member's password from the admin user editor; users use Supabase recovery.

## Database
- `DATABASE_URL` must be a real PostgreSQL connection string.
- Production does not silently swap to a mock/in-memory database when Supabase PostgreSQL is unavailable.
- Core authenticated reads fail instead of returning memory data when the database query fails.

## Required SCM Supabase migrations
Run only in the SCM SPIP Supabase project, in this order:
1. `database/migrations/phase_1_supabase_auth.sql`
2. Create the two administrator identities in Supabase Authentication.
3. `database/migrations/phase_1b_security_hardening.sql`
4. `database/migrations/phase_1c_profile_rls_fix.sql`

Phase 1C replaces a recursive `profiles` RLS policy with a security-definer helper to avoid PostgreSQL RLS recursion during profile reads.

## Production environment
Required for Phase 1 authentication/data:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `DATABASE_URL`

Integration keys such as Apollo, Gemini and VAPID remain separate server/runtime settings.

## Validation performed in CI
The Phase 1 hardening workflow validates that:
- trusted `x-user-id` / `x-user-role` / `x-user-email` client identity headers are removed from the primary app/push path;
- legacy localStorage authentication profile state is removed;
- database mock fallback is removed from the production DB connector;
- bearer-token API wiring exists;
- TypeScript validation passes;
- the production build succeeds.
