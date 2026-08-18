CREATE TYPE "public"."application_event_type" AS ENUM('status_change', 'note', 'interview_scheduled');--> statement-breakpoint
CREATE TYPE "public"."application_source" AS ENUM('manual', 'automation');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('wishlist', 'applied', 'interview', 'offer', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."automation_run_status" AS ENUM('queued', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."automation_run_type" AS ENUM('scrape', 'autofill');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."scrape_source" AS ENUM('linkedin', 'indeed', 'generic');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"event_type" "application_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company" text NOT NULL,
	"role_title" text NOT NULL,
	"job_url" text,
	"status" "application_status" DEFAULT 'wishlist' NOT NULL,
	"applied_at" timestamp with time zone,
	"source" "application_source" DEFAULT 'manual' NOT NULL,
	"match_score" integer,
	"notes" text,
	"salary_range" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"application_id" text,
	"type" "automation_run_type" NOT NULL,
	"status" "automation_run_status" DEFAULT 'queued' NOT NULL,
	"logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text,
	"location" text,
	"linkedin_url" text,
	"portfolio_url" text,
	"work_auth_status" text
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"storage_path" text NOT NULL,
	"parsed_text" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraped_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "scrape_source" NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"user_id" text PRIMARY KEY NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'incomplete' NOT NULL,
	"current_period_end" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_events_application_id_idx" ON "application_events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "applications_user_id_status_idx" ON "applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "automation_runs_user_id_status_idx" ON "automation_runs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "automation_runs_logs_gin_idx" ON "automation_runs" USING gin ("logs");--> statement-breakpoint
CREATE INDEX "resumes_user_id_idx" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scraped_jobs_raw_gin_idx" ON "scraped_jobs" USING gin ("raw");