import { verifyToken } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types.js";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (c.req.path.startsWith("/api/webhooks")) {
    await next();
    return;
  }

  const header = c.req.header("Authorization");
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return c.json({ error: "Missing token" }, 401);
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return c.json({ error: "Auth is not configured" }, 503);
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    if (!payload.sub) {
      return c.json({ error: "Invalid token" }, 401);
    }
    c.set("clerkUserId", payload.sub);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
