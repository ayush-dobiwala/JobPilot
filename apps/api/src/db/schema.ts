import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

type AutomationLogJson = {
  step: string;
  message: string;
  screenshotUrl?: string;
  timestamp: string;
};

export const planEnum = pgEnum("plan", ["free", "pro"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
]);

export const applicationSourceEnum = pgEnum("application_source", ["manual", "automation"]);

export const applicationEventTypeEnum = pgEnum("application_event_type", [
  "status_change",
  "note",
  "interview_scheduled",
]);

export const automationRunTypeEnum = pgEnum("automation_run_type", ["scrape", "autofill"]);

export const automationRunStatusEnum = pgEnum("automation_run_status", [
  "queued",
  "running",
  "success",
  "failed",
]);

export const scrapeSourceEnum = pgEnum("scrape_source", ["linkedin", "indeed", "generic"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone"),
  location: text("location"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  workAuthStatus: text("work_auth_status"),
});

export const resumes = pgTable(
  "resumes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Friendly name so users pick the right version for a role (e.g. "DevOps — cloud focus"). */
    label: text("label").notNull().default("My resume"),
    storagePath: text("storage_path").notNull(),
    parsedText: text("parsed_text"),
    isPrimary: boolean("is_primary").notNull().default(false),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("resumes_user_id_idx").on(table.userId)],
);

export const applications = pgTable(
  "applications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    company: text("company").notNull(),
    roleTitle: text("role_title").notNull(),
    jobUrl: text("job_url"),
    status: applicationStatusEnum("status").notNull().default("wishlist"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    source: applicationSourceEnum("source").notNull().default("manual"),
    matchScore: integer("match_score"),
    notes: text("notes"),
    salaryRange: text("salary_range"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("applications_user_id_status_idx").on(table.userId, table.status)],
);

export const applicationEvents = pgTable(
  "application_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    eventType: applicationEventTypeEnum("event_type").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("application_events_application_id_idx").on(table.applicationId)],
);

export const automationRuns = pgTable(
  "automation_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applicationId: text("application_id").references(() => applications.id, {
      onDelete: "set null",
    }),
    type: automationRunTypeEnum("type").notNull(),
    status: automationRunStatusEnum("status").notNull().default("queued"),
    logs: jsonb("logs")
      .$type<AutomationLogJson[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("automation_runs_user_id_status_idx").on(table.userId, table.status),
    index("automation_runs_logs_gin_idx").using("gin", table.logs),
  ],
);

export const scrapedJobs = pgTable(
  "scraped_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    source: scrapeSourceEnum("source").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    raw: jsonb("raw")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("scraped_jobs_raw_gin_idx").using("gin", table.raw)],
);

export const subscriptions = pgTable("subscriptions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: planEnum("plan").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("incomplete"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
});

export const matchScoreRuns = pgTable(
  "match_score_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resumeId: text("resume_id").references(() => resumes.id, { onDelete: "set null" }),
    jobDescription: text("job_description").notNull(),
    score: integer("score").notNull(),
    missingKeywords: jsonb("missing_keywords")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    suggestions: jsonb("suggestions")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("match_score_runs_user_id_created_at_idx").on(table.userId, table.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type ApplicationEventRow = typeof applicationEvents.$inferSelect;
export type ResumeRow = typeof resumes.$inferSelect;
export type MatchScoreRunRow = typeof matchScoreRuns.$inferSelect;
export type AutomationRunRow = typeof automationRuns.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
