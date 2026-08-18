import { afterEach, describe, expect, it } from "vitest";
import type { MiddlewareHandler } from "hono";
import { createApp } from "../src/app.js";
import type { AppEnv } from "../src/types.js";
import { MemoryApplicationStore, MemoryUserStore } from "./memoryStores.js";

const passthroughAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("clerkUserId", "user_test");
  await next();
};

const passthroughRateLimit: MiddlewareHandler<AppEnv> = async (_c, next) => {
  await next();
};

const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  } else {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
  }
});

describe("clerk webhook", () => {
  it("provisions a user on user.created", async () => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_test";
    const users = new MemoryUserStore();
    const app = createApp({
      applications: new MemoryApplicationStore(),
      users,
      requireAuth: passthroughAuth,
      rateLimit: passthroughRateLimit,
      verifyClerkWebhook: (payload) => JSON.parse(payload) as unknown,
    });

    const response = await app.request("/api/webhooks/clerk", {
      method: "POST",
      body: JSON.stringify({
        type: "user.created",
        data: {
          id: "user_123",
          email_addresses: [{ email_address: "ada@example.com" }],
          first_name: "Ada",
          last_name: "Lovelace",
        },
      }),
    });

    expect(response.status).toBe(201);
    expect(users.users.get("user_123")).toMatchObject({
      id: "user_123",
      email: "ada@example.com",
      name: "Ada Lovelace",
      plan: "free",
    });
  });

  it("returns 503 when the signing secret is missing", async () => {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    const app = createApp({
      applications: new MemoryApplicationStore(),
      users: new MemoryUserStore(),
      requireAuth: passthroughAuth,
      rateLimit: passthroughRateLimit,
      verifyClerkWebhook: () => {
        throw new Error("should not run");
      },
    });

    const response = await app.request("/api/webhooks/clerk", {
      method: "POST",
      body: "{}",
    });
    expect(response.status).toBe(503);
  });
});
