import "./lib/loadEnv.js";
import { Webhook } from "svix";
import { db } from "./db/client.js";
import { createApp } from "./app.js";
import { requireAuth } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { createApplicationsService } from "./services/applications.js";
import { createUsersService } from "./services/users.js";

function verifyClerkWebhook(payload: string, headers: Headers): unknown {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    throw new Error("CLERK_WEBHOOK_SIGNING_SECRET is not set");
  }

  const webhook = new Webhook(secret);
  return webhook.verify(payload, {
    "svix-id": headers.get("svix-id") ?? "",
    "svix-timestamp": headers.get("svix-timestamp") ?? "",
    "svix-signature": headers.get("svix-signature") ?? "",
  });
}

export const app = createApp({
  applications: createApplicationsService(db),
  users: createUsersService(db),
  requireAuth,
  rateLimit: rateLimit({ windowMs: 60_000, max: 120 }),
  verifyClerkWebhook,
});

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`JobPilot API listening on http://localhost:${port}`);
