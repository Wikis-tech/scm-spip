-- ================================================================================
-- SQL CODE 002: SCM Discovery Engine Dedicated Table Verification and Idempotent Schema Script
-- Purpose: Ensures discovered_leads, discovery_sessions, and audit_logs tables and indexes exist
-- Rollback Notes: DROP TABLE IF EXISTS "discovered_leads", "discovery_sessions", "audit_logs";
-- ================================================================================

BEGIN;

-- 1. Discovered Leads Table
CREATE TABLE IF NOT EXISTS "discovered_leads" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text,
  "name" text NOT NULL,
  "industry" text NOT NULL,
  "size" text NOT NULL,
  "website" text NOT NULL,
  "location" text NOT NULL,
  "opportunity_score" integer NOT NULL,
  "confidence_score" integer DEFAULT 85,
  "reason" text NOT NULL,
  "already_imported" boolean DEFAULT false NOT NULL,
  "business_fit" text DEFAULT 'High Fit',
  "treasury_potential" text,
  "estimated_revenue_value" bigint DEFAULT 2500000000,
  "recommended_products" jsonb,
  "decision_makers" jsonb,
  "latest_news" text,
  "source" text,
  "revenue_range" text,
  "created_at" text
);

ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "confidence_score" integer DEFAULT 85;
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "business_fit" text DEFAULT 'High Fit';
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "treasury_potential" text;
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "estimated_revenue_value" bigint DEFAULT 2500000000;
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "recommended_products" jsonb;
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "decision_makers" jsonb;
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "latest_news" text;
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "revenue_range" text;

CREATE INDEX IF NOT EXISTS "idx_discovered_leads_user_id" ON "discovered_leads"("user_id");

-- 2. Discovery Sessions Table
CREATE TABLE IF NOT EXISTS "discovery_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "user_email" text,
  "source" text NOT NULL,
  "industry" text NOT NULL,
  "location" text NOT NULL,
  "size_tier" text NOT NULL,
  "revenue_range" text NOT NULL,
  "target_product" text NOT NULL,
  "eval_count" integer DEFAULT 0 NOT NULL,
  "rec_count" integer DEFAULT 0 NOT NULL,
  "saved_count" integer DEFAULT 0 NOT NULL,
  "created_at" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_discovery_sessions_user_id" ON "discovery_sessions"("user_id");

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "timestamp" text NOT NULL,
  "search_term" text NOT NULL,
  "user" text NOT NULL,
  "user_id" text,
  "user_email" text,
  "status" text NOT NULL,
  "confidence_score" integer DEFAULT 90 NOT NULL,
  "action_taken" text NOT NULL
);

COMMIT;
