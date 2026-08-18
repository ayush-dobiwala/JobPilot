import { createMiddleware } from "hono/factory";
import { consumeRateLimit } from "../lib/rateLimitWindow.js";
import type { AppEnv } from "../types.js";

const hits = new Map<string, number[]>();

export function rateLimit(options: { windowMs: number; max: number }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (c.req.path.startsWith("/api/webhooks")) {
      await next();
      return;
    }

    const key = c.get("clerkUserId") || c.req.header("x-forwarded-for") || "anon";
    const current = hits.get(key) ?? [];
    const result = consumeRateLimit(current, Date.now(), options.windowMs, options.max);
    hits.set(key, result.next);

    if (!result.allowed) {
      return c.json({ error: "Too many requests" }, 429);
    }

    await next();
  });
}
