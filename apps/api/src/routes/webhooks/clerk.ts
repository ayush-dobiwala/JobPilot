import { Hono } from "hono";
import { mapUserCreated, parseClerkWebhookEvent } from "../../lib/clerkWebhook.js";
import type { UserStore } from "../../services/users.js";

export function createClerkWebhookRouter(options: {
  users: UserStore;
  verify: (payload: string, headers: Headers) => unknown;
}): Hono {
  const router = new Hono();

  router.post("/clerk", async (c) => {
    const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!secret) {
      return c.json({ error: "Webhook is not configured" }, 503);
    }

    const payload = await c.req.text();
    let verified: unknown;
    try {
      verified = options.verify(payload, c.req.raw.headers);
    } catch {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }

    const event = parseClerkWebhookEvent(verified);
    if (!event) {
      return c.json({ error: "Invalid webhook payload" }, 400);
    }

    const user = mapUserCreated(event);
    if (!user) {
      return c.json({ received: true });
    }

    await options.users.provision(user);
    return c.json({ received: true }, 201);
  });

  return router;
}
