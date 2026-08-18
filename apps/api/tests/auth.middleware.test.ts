import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyToken = vi.fn();

vi.mock("@clerk/backend", () => ({
  verifyToken: (...args: unknown[]) => verifyToken(...args),
}));

import { Hono } from "hono";
import { requireAuth } from "../src/middleware/auth.js";
import type { AppEnv } from "../src/types.js";

function appWithAuth(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use("/api/*", requireAuth);
  app.get("/api/secure", (c) => c.json({ userId: c.get("clerkUserId") }));
  app.post("/api/webhooks/clerk", (c) => c.json({ ok: true }));
  return app;
}

describe("requireAuth", () => {
  beforeEach(() => {
    verifyToken.mockReset();
    process.env.CLERK_SECRET_KEY = "sk_test";
  });

  it("rejects a missing bearer token", async () => {
    const response = await appWithAuth().request("/api/secure");
    expect(response.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    verifyToken.mockRejectedValueOnce(new Error("bad token"));
    const response = await appWithAuth().request("/api/secure", {
      headers: { authorization: "Bearer nope" },
    });
    expect(response.status).toBe(401);
  });

  it("attaches clerkUserId from a valid token", async () => {
    verifyToken.mockResolvedValueOnce({ sub: "user_abc" });
    const response = await appWithAuth().request("/api/secure", {
      headers: { authorization: "Bearer good" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ userId: "user_abc" });
  });

  it("skips auth for Clerk webhooks", async () => {
    const response = await appWithAuth().request("/api/webhooks/clerk", { method: "POST" });
    expect(response.status).toBe(200);
    expect(verifyToken).not.toHaveBeenCalled();
  });
});
