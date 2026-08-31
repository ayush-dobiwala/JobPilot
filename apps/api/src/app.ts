import { Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { createAnalyticsRouter } from "./routes/analytics.js";
import { createApplicationsRouter } from "./routes/applications.js";
import { createAutomationRouter } from "./routes/automation.js";
import { createBillingRouter } from "./routes/billing.js";
import { createMatchScoreRouter } from "./routes/matchScore.js";
import { createMeRouter } from "./routes/me.js";
import { createProfilesRouter } from "./routes/profiles.js";
import { createResumesRouter } from "./routes/resumes.js";
import { createClerkWebhookRouter } from "./routes/webhooks/clerk.js";
import { createStripeWebhookRouter } from "./routes/webhooks/stripe.js";
import type { AnalyticsStore } from "./services/analytics.js";
import type { ApplicationStore } from "./services/applications.js";
import type { AutomationStore } from "./services/automation.js";
import type { BillingStore } from "./services/billing.js";
import type { MatchScoreStore } from "./services/matchScore.js";
import type { ProfileStore } from "./services/profiles.js";
import type { ResumeStore } from "./services/resumes.js";
import type { UserStore } from "./services/users.js";
import type { AppEnv } from "./types.js";

export interface CreateAppOptions {
  applications: ApplicationStore;
  users: UserStore;
  resumes: ResumeStore;
  matchScore: MatchScoreStore;
  automation: AutomationStore;
  analytics: AnalyticsStore;
  billing: BillingStore;
  profiles: ProfileStore;
  requireAuth: MiddlewareHandler<AppEnv>;
  rateLimit: MiddlewareHandler<AppEnv>;
  verifyClerkWebhook: (payload: string, headers: Headers) => unknown;
  verifyStripeWebhook: (payload: string, signature: string) => unknown | Promise<unknown>;
}

export function createApp(options: CreateAppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", cors());

  app.get("/health", (c) => c.json({ status: "ok" }));

  const webhooks = new Hono<AppEnv>();
  webhooks.route(
    "/",
    createClerkWebhookRouter({
      users: options.users,
      verify: options.verifyClerkWebhook,
    }),
  );
  webhooks.route(
    "/",
    createStripeWebhookRouter({
      billing: options.billing,
      verify: options.verifyStripeWebhook,
    }),
  );
  app.route("/api/webhooks", webhooks);

  app.use("/api/*", options.requireAuth);
  app.use("/api/*", options.rateLimit);

  app.route("/api/applications", createApplicationsRouter(options.applications));
  app.route("/api/me", createMeRouter(options.users));
  app.route("/api/resumes", createResumesRouter(options.resumes));
  app.route("/api/match-score", createMatchScoreRouter(options.matchScore));
  app.route("/api/automation", createAutomationRouter(options.automation));
  app.route("/api/analytics", createAnalyticsRouter(options.analytics));
  app.route("/api/billing", createBillingRouter(options.billing));
  app.route("/api/profile", createProfilesRouter(options.profiles));

  return app;
}
