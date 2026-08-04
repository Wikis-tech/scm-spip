ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "confidence_score" integer DEFAULT 85;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "business_fit" text DEFAULT 'High Fit';--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "treasury_potential" text;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "estimated_revenue_value" bigint DEFAULT 2500000000;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "recommended_products" jsonb;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "decision_makers" jsonb;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "latest_news" text;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "source" text;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "revenue_range" text;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN IF NOT EXISTS "created_at" text;--> statement-breakpoint
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
