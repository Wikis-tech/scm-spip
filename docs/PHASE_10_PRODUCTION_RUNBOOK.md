# SPIP production runbook

## Release gate

1. Merge only a reviewed PR whose TypeScript check and production build pass.
2. Apply every pending Supabase migration before promoting the matching Vercel deployment.
3. Verify sign-in, staff/admin isolation, CRM CRUD, Apex allocation, Copilot history/research, uploads, four exports, Analytics, branding, PWA and support tickets.
4. Confirm `/api/health` returns HTTP 200 and current Vercel runtime logs contain no new uncaught errors.
5. Promote the exact accepted preview; do not rebuild an older commit.

## Support operations

- Staff create private requests from Help & Support → My tickets.
- HOD Admin and Super Admin use Help & Support → Admin inbox to reply and change status.
- Never paste passwords, API keys, private keys or unnecessary client data into a ticket.
- A closed ticket cannot be reopened by staff; create a new request if the issue recurs.

## Incident response

1. Record time, affected users, page, request ID and exact error without collecting passwords.
2. Check Vercel deployment/runtime logs and Supabase Auth/Postgres/API logs.
3. Contain access or data-exposure incidents first; suspend affected accounts or route only when authorised.
4. Roll back Vercel to the last accepted deployment when a new release caused the incident.
5. Restore database data only from an approved Supabase backup after confirming target project and recovery point.
6. Verify the repaired user journey and document the cause, fix and prevention.

## Backup and recovery

- Confirm the Supabase project backup/PITR policy matches SCM’s retention requirement before launch.
- Test restoration in an isolated project or branch; never rehearse against production.
- Keep migrations in source control and record the Vercel deployment ID paired with each release.
- After recovery, validate RLS, employee ownership, prospect allocations, conversations, documents, artifacts and support tickets.

## Rollback

1. Select the immediately previous accepted Vercel production deployment and promote it.
2. Do not reverse a database migration by deleting data. Use a reviewed forward migration.
3. Re-run authentication, CRM and export smoke tests.
4. Communicate impact and resolution to affected employees.

## Monthly checks

- Review Supabase security and performance advisors.
- Review dependency vulnerabilities and expired/unused secrets.
- Review failed authentication, rate limits, 5xx errors and slow API routes.
- Confirm administrators answer or close outstanding support tickets.
- Test one restore rehearsal and one mobile/PWA regression before major releases.
