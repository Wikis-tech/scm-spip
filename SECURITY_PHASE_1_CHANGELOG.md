# SPIP Phase 1 Security Changelog

- Migrated browser authentication to Supabase Auth.
- Restricted registration to SCM corporate email addresses.
- Added pending-account approval model with `SUPER_ADMIN`, `HOD_ADMIN`, and `STAFF` permission levels.
- Added server-side Supabase JWT verification for protected APIs.
- Removed server trust in client-supplied identity/role headers.
- Removed seeded/default application passwords and automatic approved-user provisioning.
- Removed plaintext password storage from the application user schema.
- Disabled direct administrator password setting; recovery is handled by Supabase Auth.
- Added secure logout and bearer-token request handling.
- Added RLS foundation and server-mediated business-data access.
- Added safe migration from legacy user IDs to Supabase Auth UUIDs while preserving CRM foreign keys.
- Removed committed Apollo fallback credential usage and browser-style Apollo secret access.
- Removed forensic utilities that could disclose runtime/database information.
- Added fail-closed production database handling.
- Added Vercel serverless entrypoint/configuration.
- Added permanent CI type-check, build, and security assertions.
