-- ================================================================================
-- SQL CODE 003: SCM Discovery Queue Engine Table & Multi-Officer Session Memory
-- Purpose: Ensures discovery_queues table exists for dynamic next-three queue batching and duplicate prevention
-- Rollback Notes: DROP TABLE IF EXISTS "discovery_queues";
-- ================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "discovery_queues" (
  "user_id" text PRIMARY KEY NOT NULL,
  "served_company_names" jsonb DEFAULT '[]'::jsonb,
  "dismissed_company_names" jsonb DEFAULT '[]'::jsonb,
  "last_scan_at" text,
  "updated_at" text
);

ALTER TABLE "discovery_queues" ADD COLUMN IF NOT EXISTS "dismissed_company_names" jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "idx_discovery_queues_user_id" ON "discovery_queues"("user_id");

COMMIT;
