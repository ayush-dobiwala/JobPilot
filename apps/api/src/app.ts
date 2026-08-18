import { Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { createApplicationsRouter } from "./routes/applications.js";
import { createClerkWebhookRouter } from "./routes/webhooks/clerk.js";
import type { ApplicationStore } from "./services/applications.js";
import type { UserStore } from "./services/users.js";
import type { AppEnv } from "./types.js";

export interface CreateAppOptions {
  applications: ApplicationStore;
  users: UserStore;
  requireAuth: MiddlewareHandler<AppEnv>;
  rateLimit: MiddlewareHandler<AppEnv>;
  verifyClerkWebhook: (payload: string, headers: Headers) => unknown;
}

export function createApp(options: CreateAppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", cors());

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.route(
    "/api/webhooks",
    createClerkWebhookRouter({
      users: options.users,
      verify: options.verifyClerkWebhook,
    }),
  );

  app.use("/api/*", options.requireAuth);
  app.use("/api/*", options.rateLimit);

  app.route("/api/applications", createApplicationsRouter(options.applications));

  return app;
}
