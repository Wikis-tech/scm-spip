# Phase 5 — Microsoft 365 / Outlook / Microsoft Graph

## Objective
Give each ACTIVE SCM SPIP user an optional delegated connection to their own `@scmcapitalng.com` Microsoft 365 mailbox so SPIP can:

- send relationship emails from the employee's Outlook mailbox;
- publish SPIP meetings into that employee's Outlook calendar;
- read upcoming Outlook calendar events;
- keep Microsoft credentials server-side and encrypted at rest;
- disconnect/revoke the SPIP connection without affecting the employee's Microsoft mailbox.

## Security architecture

SPIP uses Microsoft Entra authorization-code flow with PKCE. The browser receives only an authorization URL and sanitized connection status. Microsoft access and refresh tokens are exchanged server-side and encrypted with AES-256-GCM before database storage.

OAuth states are random, one-use and expire after 10 minutes. A successful callback is rejected unless:

1. the initiating SPIP profile is still ACTIVE;
2. the Microsoft mailbox ends in `@scmcapitalng.com`;
3. the Microsoft mailbox exactly matches the user's SPIP corporate email.

The Microsoft token tables are RLS-enabled and permissions are revoked from `anon` and `authenticated`; only the Supabase service role can access them through authenticated SPIP server routes.

## Entra app registration

Create a **single-tenant** Microsoft Entra application for SCM Capital SPIP.

Redirect URI (Web):

`https://scm-spip.vercel.app/api/microsoft/callback`

Delegated Microsoft Graph permissions:

- `User.Read`
- `Mail.Send`
- `Calendars.ReadWrite`
- `openid`
- `profile`
- `email`
- `offline_access`

Grant tenant admin consent if SCM policy requires it.

## Vercel environment variables

Set for **Production and Preview**:

- `SPIP_PUBLIC_URL=https://scm-spip.vercel.app`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI=https://scm-spip.vercel.app/api/microsoft/callback`
- `MICROSOFT_TOKEN_ENCRYPTION_KEY` — a long random secret, separate from the client secret

Never create `VITE_MICROSOFT_CLIENT_SECRET`, `VITE_MICROSOFT_TOKEN_ENCRYPTION_KEY`, or any browser-visible equivalent.

## Database

Apply:

`database/migrations/phase_5_microsoft_365.sql`

This creates:

- `microsoft_connections`
- `microsoft_oauth_states`
- `microsoft_event_links`

## Acceptance test

1. Log into SPIP with an ACTIVE `@scmcapitalng.com` employee.
2. Settings → Microsoft 365 → Connect.
3. Microsoft should request the delegated permissions above.
4. Connecting a personal Microsoft account or a different SCM mailbox must fail.
5. After success, Settings must show Connected and the matching SCM mailbox.
6. `GET /api/microsoft/calendar/events` must return only that user's calendar data.
7. Publish a SPIP meeting with `/api/microsoft/calendar/publish`; verify it appears in that user's Outlook calendar with a 15-minute reminder.
8. Send a test email through `/api/microsoft/mail/send`; verify it appears in Outlook Sent Items and, when a prospect id is supplied, SPIP records an Email activity.
9. Disconnect in Settings. The connection row/tokens must be removed while existing Outlook mail/events remain intact.
10. Reconnect and repeat to verify refresh-token rotation and reconnect safety.

## Release gate

Do not merge Phase 5 to production until:

- migration applied successfully;
- Entra/Vercel configuration completed;
- TypeScript passes;
- production build passes;
- Phase 5 security assertions pass;
- unauthenticated `/api/microsoft/status` returns 401;
- real SCM Microsoft 365 connect/calendar/mail/disconnect acceptance test passes.