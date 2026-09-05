-- Phase 6F: add covering indexes for Copilot ownership and relationship lookups.
-- These indexes are safe to apply repeatedly.
begin;

create index if not exists idx_spip_ai_messages_user_id
  on public.spip_ai_messages(user_id);

create index if not exists idx_spip_ai_documents_conversation_id
  on public.spip_ai_documents(conversation_id);

create index if not exists idx_spip_ai_artifacts_conversation_id
  on public.spip_ai_artifacts(conversation_id);

create index if not exists idx_spip_ai_usage_events_conversation_id
  on public.spip_ai_usage_events(conversation_id);

commit;
