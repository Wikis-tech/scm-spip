CREATE TABLE "ai_search_history" (
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
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
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
--> statement-breakpoint
CREATE TABLE "saved_sessions" (
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
--> statement-breakpoint
CREATE TABLE "serena_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"prompt" text NOT NULL,
	"timestamp" text NOT NULL,
	"model_used" text NOT NULL,
	"tokens_consumed" integer NOT NULL,
	"response_time_ms" integer NOT NULL,
	"module" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_audit_logs" (
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
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
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
--> statement-breakpoint
CREATE TABLE "workspace_ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_prompt" text NOT NULL,
	"response_text" text NOT NULL,
	"model_used" text DEFAULT 'gemini-2.5-flash' NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_notes" (
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
--> statement-breakpoint
CREATE TABLE "workspace_presentations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_proposals" (
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
--> statement-breakpoint
CREATE TABLE "workspace_search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"search_term" text NOT NULL,
	"source" text NOT NULL,
	"response" text NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
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
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_email" text;--> statement-breakpoint
ALTER TABLE "discovered_leads" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "stage_entered_date" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "stage_updated_date" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "actual_revenue" double precision;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "last_activity_date" text;--> statement-breakpoint
ALTER TABLE "prospects" ADD COLUMN "next_action" text;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "officer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'Pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_search_history" ADD CONSTRAINT "ai_search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_ai_conversations" ADD CONSTRAINT "workspace_ai_conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_ai_conversations" ADD CONSTRAINT "workspace_ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_presentations" ADD CONSTRAINT "workspace_presentations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_presentations" ADD CONSTRAINT "workspace_presentations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_proposals" ADD CONSTRAINT "workspace_proposals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_proposals" ADD CONSTRAINT "workspace_proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_search_history" ADD CONSTRAINT "workspace_search_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_search_history" ADD CONSTRAINT "workspace_search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;