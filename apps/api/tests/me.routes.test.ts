import { beforeEach, describe, expect, it } from "vitest";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app.js";
import type { AppEnv } from "../src/types.js";
import { MemoryApplicationStore, MemoryUserStore } from "./memoryStores.js";

const passthroughAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("clerkUserId", c.req.header("x-user-id") ?? "user_test");
  await next();
};

const passthroughRateLimit: MiddlewareHandler<AppEnv> = async (_c, next) => {
  await next();
};

describe("GET /api/me", () => {
  let users: MemoryUserStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    users = new MemoryUserStore();
    app = createApp({
      applications: new MemoryApplicationStore(),
      users,
      requireAuth: passthroughAuth,
      rateLimit: passthroughRateLimit,
      verifyClerkWebhook: (payload) => JSON.parse(payload) as unknown,
    });
  });

  it("returns 404 until the user is provisioned", async () => {
    const response = await app.request("/api/me");
    expect(response.status).toBe(404);
  });

  it("returns the provisioned user for the current Clerk id", async () => {
    await users.provision({
      id: "user_test",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });

    const response = await app.request("/api/me");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { email: string; plan: string };
    expect(body.email).toBe("ada@example.com");
    expect(body.plan).toBe("free");
  });
});
