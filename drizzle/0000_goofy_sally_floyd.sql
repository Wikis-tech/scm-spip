CREATE TABLE "activities" (
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
--> statement-breakpoint
CREATE TABLE "audit_logs" (
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
--> statement-breakpoint
CREATE TABLE "contacts" (
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
--> statement-breakpoint
CREATE TABLE "discovered_leads" (
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
--> statement-breakpoint
CREATE TABLE "meetings" (
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
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"date" text NOT NULL,
	"severity" text DEFAULT 'Low' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
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
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "prospects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"prospect_id" text,
	"prospect_name" text,
	"title" text NOT NULL,
	"due_date" text NOT NULL,
	"assigned_staff" text NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'Business Development Officer' NOT NULL,
	"department" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_assigned_officer_id_users_id_fk" FOREIGN KEY ("assigned_officer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;