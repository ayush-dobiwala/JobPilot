import { Hono } from "hono";
import type { AnalyticsStore } from "../services/analytics.js";
import type { AppEnv } from "../types.js";

export function createAnalyticsRouter(store: AnalyticsStore): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/summary", async (c) => {
    const summary = await store.getSummary(c.get("clerkUserId"));
    return c.json(summary);
  });

  router.get("/funnel", async (c) => {
    const funnel = await store.getFunnel(c.get("clerkUserId"));
    return c.json(funnel);
  });

  return router;
}
