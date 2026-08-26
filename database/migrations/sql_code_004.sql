-- ================================================================================
-- SQL CODE 004: SCM Apollo Enterprise Enrichment Cache Table
-- Purpose: Persists enriched Apollo organization and executive records to minimize API requests, enforce rate limits, and maintain high performance
-- Rollback Notes: DROP TABLE IF EXISTS "apollo_enrichment_cache";
-- ================================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "apollo_enrichment_cache" (
  "apollo_org_id" text PRIMARY KEY NOT NULL,
  "company_name" text NOT NULL,
  "domain" text,
  "website" text,
  "industry" text,
  "employee_count" text,
  "revenue_estimate" text,
  "headquarters" text,
  "linkedin_url" text,
  "executives_json" jsonb DEFAULT '[]'::jsonb,
  "raw_apollo_data" jsonb DEFAULT '{}'::jsonb,
  "cache_status" text NOT NULL DEFAULT 'Active',
  "last_synced_at" text NOT NULL,
  "created_at" text NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_apollo_cache_domain" ON "apollo_enrichment_cache"("domain");
CREATE INDEX IF NOT EXISTS "idx_apollo_cache_company_name" ON "apollo_enrichment_cache"("company_name");

COMMIT;
