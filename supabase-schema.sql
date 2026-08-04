-- SCM Capital Prospect Intelligence Platform (SPIP)
-- Comprehensive PostgreSQL Schema derived exactly from Drizzle ORM definition
-- Designed for direct import into Supabase PostgreSQL

-- 1. Create Core Tables
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'Business Development Officer' NOT NULL,
	"department" text,
	"avatar_url" text,
	"password" text,
	"status" text DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

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
	"assigned_officer_id" text,
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
	"updated_at" text NOT NULL,
	CONSTRAINT "prospects_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"prospect_id" text NOT NULL,
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

CREATE TABLE IF NOT EXISTS "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"prospect_id" text NOT NULL,
	"prospect_name" text,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"officer_id" text,
	"officer_name" text,
	"activity_type" text NOT NULL,
	"outcome" text,
	"notes" text,
	"status" text DEFAULT 'Completed' NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"prospect_id" text NOT NULL,
	"prospect_name" text,
	"officer_id" text NOT NULL,
	"officer_name" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"duration_minutes" integer DEFAULT 45 NOT NULL,
	"purpose" text NOT NULL,
	"outcome" text,
	"next_action" text,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"prospect_id" text,
	"prospect_name" text,
	"title" text NOT NULL,
	"due_date" text NOT NULL,
	"assigned_staff" text NOT NULL,
	"officer_id" text,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"notes" text
);

CREATE TABLE IF NOT EXISTS "news_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"date" text NOT NULL,
	"severity" text DEFAULT 'Low' NOT NULL
);

CREATE TABLE IF NOT EXISTS "discovered_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"size" text NOT NULL,
	"website" text NOT NULL,
	"location" text NOT NULL,
	"opportunity_score" integer NOT NULL,
	"reason" text NOT NULL,
	"already_imported" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" text NOT NULL,
	"search_term" text NOT NULL,
	"user" text NOT NULL,
	"status" text NOT NULL,
	"sources_used" jsonb,
	"confidence_score" integer NOT NULL,
	"action_taken" text NOT NULL,
	"failures" jsonb
);

CREATE TABLE IF NOT EXISTS "saved_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"target_company" text NOT NULL,
	"user_input" text NOT NULL,
	"content" text NOT NULL,
	"product_scoring" jsonb,
	"created_at" text NOT NULL,
	"notes" text
);

CREATE TABLE IF NOT EXISTS "serena_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"prompt" text NOT NULL,
	"timestamp" text NOT NULL,
	"model_used" text NOT NULL,
	"tokens_consumed" integer NOT NULL,
	"response_time_ms" integer NOT NULL,
	"module" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"source_id" text NOT NULL,
	"prospect_id" text,
	"prospect_name" text,
	"title" text NOT NULL,
	"reminder_time_text" text NOT NULL,
	"reminder_date_time" text NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "system_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" text NOT NULL,
	"user_id" text,
	"user_email" text,
	"user_name" text,
	"action" text NOT NULL,
	"target" text,
	"status" text NOT NULL,
	"metadata" jsonb
);

CREATE TABLE IF NOT EXISTS "weekly_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"week_start_date" text NOT NULL,
	"week_end_date" text NOT NULL,
	"summary" text NOT NULL,
	"prospects_added" integer DEFAULT 0 NOT NULL,
	"meetings_held" integer DEFAULT 0 NOT NULL,
	"follow_ups_completed" integer DEFAULT 0 NOT NULL,
	"funds_secured" double precision DEFAULT 0 NOT NULL,
	"products_sold" text NOT NULL,
	"challenges" text NOT NULL,
	"next_week_plan" text NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"submitted_at" text,
	"updated_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"prospect_id" text,
	"owner_user_id" text NOT NULL,
	"company_name" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"apollo_findings" text,
	"company_profile" text,
	"industry_analysis" text,
	"executive_insights" text,
	"investment_opportunities" text,
	"research_summaries" text
);

CREATE TABLE IF NOT EXISTS "workspace_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"prospect_id" text,
	"workspace_id" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"approval_status" text DEFAULT 'Draft' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_presentations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_prompt" text NOT NULL,
	"response_text" text NOT NULL,
	"model_used" text DEFAULT 'gemini-2.5-flash' NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspace_search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"search_term" text NOT NULL,
	"source" text NOT NULL,
	"response" text NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"company_name" text,
	"search_query" text NOT NULL,
	"search_type" text NOT NULL,
	"timestamp" text NOT NULL,
	"model_used" text,
	"tokens_consumed" integer DEFAULT 0,
	"estimated_cost" double precision DEFAULT 0,
	"response_time" integer DEFAULT 0,
	"workspace_id" text,
	"search_result" text,
	"status" text DEFAULT 'Success' NOT NULL
);

-- 2. Establish Foreign Keys & Constraints
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_assigned_officer_id_users_id_fk" FOREIGN KEY ("assigned_officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "activities" ADD CONSTRAINT "activities_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "activities" ADD CONSTRAINT "activities_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_proposals" ADD CONSTRAINT "workspace_proposals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_proposals" ADD CONSTRAINT "workspace_proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_presentations" ADD CONSTRAINT "workspace_presentations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_presentations" ADD CONSTRAINT "workspace_presentations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_ai_conversations" ADD CONSTRAINT "workspace_ai_conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_ai_conversations" ADD CONSTRAINT "workspace_ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_search_history" ADD CONSTRAINT "workspace_search_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "workspace_search_history" ADD CONSTRAINT "workspace_search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "ai_search_history" ADD CONSTRAINT "ai_search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
