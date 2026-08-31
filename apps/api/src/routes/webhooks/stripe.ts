import { Hono } from "hono";
import type { BillingStore } from "../../services/billing.js";
import type { AppEnv } from "../../types.js";

export function createStripeWebhookRouter(options: {
  billing: BillingStore;
  verify: (payload: string, signature: string) => unknown | Promise<unknown>;
}): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.post("/stripe", async (c) => {
    const payload = await c.req.text();
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "Missing stripe-signature" }, 400);
    }

    try {
      const event = (await options.verify(payload, signature)) as Parameters<
        BillingStore["handleStripeEvent"]
      >[0];
      await options.billing.handleStripeEvent(event);
      return c.json({ received: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid webhook";
      return c.json({ error: message }, 400);
    }
  });

  return router;
}
