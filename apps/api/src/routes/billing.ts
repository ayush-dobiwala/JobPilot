import { Hono } from "hono";
import { BillingNotConfiguredError, type BillingStore } from "../services/billing.js";
import type { AppEnv } from "../types.js";

export function createBillingRouter(store: BillingStore): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/subscription", async (c) => {
    const subscription = await store.getSubscription(c.get("clerkUserId"));
    return c.json(subscription);
  });

  router.post("/checkout-session", async (c) => {
    try {
      const session = await store.createCheckoutSession(c.get("clerkUserId"));
      return c.json(session);
    } catch (error) {
      if (error instanceof BillingNotConfiguredError) {
        return c.json({ error: error.message }, 503);
      }
      throw error;
    }
  });

  router.post("/portal-session", async (c) => {
    try {
      const session = await store.createPortalSession(c.get("clerkUserId"));
      return c.json(session);
    } catch (error) {
      if (error instanceof BillingNotConfiguredError) {
        return c.json({ error: error.message }, 503);
      }
      throw error;
    }
  });

  return router;
}
