import { afterEach, describe, expect, it } from "vitest";
import { MemoryUserStore } from "./memoryStores.js";
import { createTestApp } from "./testHelpers.js";

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
    const app = createTestApp({ users });

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
    const app = createTestApp({
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
