-- ================================================================================
-- SQL CODE 001: SCM Prospect Intelligence Platform Complete Schema Synchronization Script
-- Purpose: Unified, idempotent execution script for PostgreSQL / Supabase Cloud SQL
--          Ensures all core tables, columns, indexes, and constraints exist.
-- ================================================================================

BEGIN;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "role" text DEFAULT 'Business Development Officer' NOT NULL,
  "department" text,
  "avatar_url" text,
  "password" text,
  "status" text DEFAULT 'Pending' NOT NULL,
  "created_at" timestamp DEFAULT NOW()
);

-- 2. Prospects Table
CREATE TABLE IF NOT EXISTS "prospects" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "industry" text NOT NULL,
  "org_type" text NOT NULL,
  "location" text NOT NULL,
  "website" text,
  "phone" text,
  "email" text,
  "source" text,
  "assigned_officer_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "assigned_officer_name" text,
  "status" text DEFAULT 'Lead' NOT NULL,
  "priority" text DEFAULT 'Medium' NOT NULL,
  "notes" text,
  "conversion_probability" integer DEFAULT 20 NOT NULL,
  "opportunity_value" double precision DEFAULT 0 NOT NULL,
  "treasury_potential" text,
  "mmf_potential" text,
  "wealth_potential" text,
  "literacy_potential" text,
  "opportunity_score" integer DEFAULT 50 NOT NULL,
  "primary_contact_id" text,
  "stage_entered_date" text,
  "stage_updated_date" text,
  "actual_revenue" double precision,
  "last_activity_date" text,
  "next_action" text,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL
);

-- 3. Contacts Table
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" text PRIMARY KEY NOT NULL,
  "prospect_id" text NOT NULL REFERENCES "prospects"("id") ON DELETE CASCADE,
  "prospect_name" text,
  "full_name" text NOT NULL,
  "position" text NOT NULL,
  "department" text,
  "email" text,
  "phone" text,
  "linkedin" text,
  "influence_level" text DEFAULT 'Medium' NOT NULL,
  "is_decision_maker" boolean DEFAULT false NOT NULL,
  "notes" text,
  "validation_level" text DEFAULT 'Unverified',
  "created_at" text NOT NULL
);

-- 4. Discovered Leads Table (AI Discovery Engine)
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
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "created_at" text;

-- 5. Discovery Sessions Table
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

-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "timestamp" text NOT NULL,
  "search_term" text NOT NULL,
  "user" text NOT NULL,
  "user_id" text,
  "user_email" text,
  "status" text NOT NULL,
  "sources_used" jsonb,
  "confidence_score" integer NOT NULL,
  "action_taken" text NOT NULL,
  "failures" jsonb
);

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_email" text;

-- 7. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL UNIQUE,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp DEFAULT NOW()
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "timestamp" text NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "category" text,
  "priority" text,
  "is_legacy" boolean DEFAULT false,
  "created_at" text,
  "read_status" text DEFAULT 'unread'
);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS "idx_discovered_leads_user_id" ON "discovered_leads" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_discovery_sessions_user_id" ON "discovery_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_prospects_assigned_officer" ON "prospects" ("assigned_officer_id");
CREATE INDEX IF NOT EXISTS "idx_contacts_prospect_id" ON "contacts" ("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");

COMMIT;
