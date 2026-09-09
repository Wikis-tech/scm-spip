-- Phase 6E: allow presentation templates after server-side extraction hardening.
begin;

update storage.buckets
set allowed_mime_types = array[
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json'
]
where id = 'spip-ai-private';

commit;
