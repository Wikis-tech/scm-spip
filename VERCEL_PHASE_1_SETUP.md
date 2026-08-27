# SCM SPIP - Vercel Phase 1 Preview Setup

Create a separate Vercel project for SPIP. Do not reuse the CampusLink project.

Repository: `Wikis-tech/scm-spip`

Required environment variables for the first preview:

## Browser-safe
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Server-only
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `APOLLO_API_KEY`

Apply the required variables to Preview and Production unless there is a deliberate environment split.

Never place `SUPABASE_SECRET_KEY`, `DATABASE_URL`, or `APOLLO_API_KEY` in a `VITE_` variable.

After the Vercel project is connected, deploy the `phase-1-supabase-auth` branch as a Preview before merging it into `main`.
