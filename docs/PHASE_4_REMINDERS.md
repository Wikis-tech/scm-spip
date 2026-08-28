# Phase 4 — Reliable reminders, push notifications and stronger alerts

## Architecture

1. Meetings/tasks are stored in Supabase.
2. Database triggers generate deterministic reminder rows in `spip_reminders`.
3. A background scheduler calls `POST /api/reminders/dispatch` every minute or five minutes.
4. The dispatcher sends Web Push through VAPID to every active user device.
5. Expired push endpoints are automatically disabled. Transient failures retry with backoff.
6. Successful sends are written to `spip_notification_events`.
7. The browser service worker displays notifications even when the SPIP tab is closed.

## Default schedule

Meetings: 24 hours, 1 hour, 10 minutes and meeting start.
Tasks: 24 hours and 1 hour before the 9:00 AM WAT due-time convention.
Follow-ups: custom date/time reminder API.

## Safety behaviour

- Rescheduling a meeting replaces pending reminders rather than duplicating them.
- Completing a meeting/task cancels future generated reminders.
- Duplicate reminder rows are prevented by a database uniqueness constraint.
- Old/expired browser subscriptions are disabled after 404/410 push responses.
- If no active device exists, the reminder remains pending and retries later instead of being falsely marked sent.
- Reminder payloads contain no API keys or secrets.
- Only ACTIVE Supabase users can register devices or read/create reminders.
- The dispatcher requires `REMINDER_CRON_SECRET`.

## Required environment variables

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (recommended: `mailto:it@scmcapitalng.com`)
- `REMINDER_CRON_SECRET` (strong random value, server only)

## Scheduler

The current Vercel workspace is on Hobby. Vercel Hobby cron is limited to once per day, which is not suitable for 10-minute/meeting-time reminders. Use Supabase `pg_cron`/Edge Function or another trusted scheduler to call:

`POST https://scm-spip.vercel.app/api/reminders/dispatch`

Header:

`X-SPIP-Reminder-Secret: <same value as Vercel REMINDER_CRON_SECRET>`

Recommended frequency: every 1–5 minutes.

Do not place the secret in GitHub, frontend code or this document.

## Browser limitations

Web Push can use vibration and `requireInteraction` where supported, but a PWA cannot guarantee behaviour identical to the native Clock alarm, especially on iOS. Phase 9 native packaging can add native scheduled notifications for stronger device-level behaviour.
