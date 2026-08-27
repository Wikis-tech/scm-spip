# SPIP Phase 1 - Supabase Auth & Security Test Checklist

Phase 1 is intentionally limited to authentication, identity, database security, secret handling, and deployment readiness.

## Required Supabase setup before preview testing

1. `database/migrations/phase_1_supabase_auth.sql` must already have run successfully.
2. Create the two initial administrator identities in Supabase Authentication using their SCM corporate email addresses and new strong passwords.
3. Run `database/migrations/phase_1b_security_hardening.sql`.
4. Verify `profiles` contains one `SUPER_ADMIN`, one `HOD_ADMIN`, and all other new registrations default to `STAFF` + `PENDING`.

## Required deployment environment

Public browser configuration:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-only configuration:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `APOLLO_API_KEY`

Optional existing integrations can be added later during their dedicated phases.

Never expose server-only values through a `VITE_` variable.

## Authentication tests

- Valid active SCM admin can sign in.
- Wrong password is rejected.
- Non-SCM email registration is rejected.
- New SCM registration creates a `PENDING` profile.
- Pending user cannot enter SPIP.
- Administrator can activate a pending user.
- Activated staff user can sign in.
- Suspended user is denied.
- Logout ends the Supabase session and returns to the sign-in screen.
- Password recovery uses Supabase's secure recovery flow.

## Authorization tests

- STAFF cannot access admin APIs.
- HOD_ADMIN can review/approve staff and see team data.
- HOD_ADMIN cannot change permission levels to admin roles.
- SUPER_ADMIN can change permission levels.
- API calls without a bearer token return 401.
- Spoofing `x-user-role`, `x-user-id`, or `x-user-email` does not grant access.

## Regression tests

After authentication succeeds, verify:
- Dashboard loads.
- Prospects load/create/update.
- Contacts load/create/update.
- CRM activities load/create/update.
- Meetings load/create/update.
- Tasks load/create/update.
- Pipeline loads.
- Workspaces load.
- Weekly report screen loads.
- Admin dashboard loads for admins only.
- Apollo search returns a real provider error when not configured, never fabricated success.

## Security gates already enforced in CI

- No legacy default password in `server.ts`.
- No plaintext password column in the Drizzle user schema.
- No browser-style Apollo secret environment variable.
- No committed Apollo fallback credential in active server/Apollo code.
- TypeScript check passes.
- Production build passes.
