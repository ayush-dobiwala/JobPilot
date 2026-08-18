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

function testApp(applications = new MemoryApplicationStore(), users = new MemoryUserStore()) {
  const app = createApp({
    applications,
    users,
    requireAuth: passthroughAuth,
    rateLimit: passthroughRateLimit,
    verifyClerkWebhook: (payload) => JSON.parse(payload) as unknown,
  });
  return { app, applications, users };
}

describe("applications routes", () => {
  let harness: ReturnType<typeof testApp>;

  beforeEach(() => {
    harness = testApp();
  });

  it("serves a health check without auth", async () => {
    const response = await harness.app.request("/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("lists an empty board for the current user", async () => {
    const response = await harness.app.request("/api/applications");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
  });

  it("creates, updates, records a status event, and deletes", async () => {
    const createdResponse = await harness.app.request("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ company: "Acme", roleTitle: "Engineer" }),
    });
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as { id: string; status: string };
    expect(created.status).toBe("wishlist");

    const patched = await harness.app.request(`/api/applications/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "applied", notes: "Submitted" }),
    });
    expect(patched.status).toBe(200);
    const updated = (await patched.json()) as { status: string; notes: string };
    expect(updated.status).toBe("applied");
    expect(updated.notes).toBe("Submitted");

    const eventsResponse = await harness.app.request(`/api/applications/${created.id}/events`);
    expect(eventsResponse.status).toBe(200);
    const events = (await eventsResponse.json()) as {
      data: { eventType: string; payload: { from: string; to: string } }[];
    };
    expect(events.data).toHaveLength(1);
    expect(events.data[0]?.eventType).toBe("status_change");
    expect(events.data[0]?.payload).toEqual({ from: "wishlist", to: "applied" });

    const deleted = await harness.app.request(`/api/applications/${created.id}`, {
      method: "DELETE",
    });
    expect(deleted.status).toBe(204);

    const missing = await harness.app.request(`/api/applications/${created.id}/events`);
    expect(missing.status).toBe(404);
  });

  it("does not leak another user's application", async () => {
    const createdResponse = await harness.app.request("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user_a" },
      body: JSON.stringify({ company: "Acme", roleTitle: "Engineer" }),
    });
    const created = (await createdResponse.json()) as { id: string };

    const otherUser = await harness.app.request(`/api/applications/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-user-id": "user_b" },
      body: JSON.stringify({ status: "rejected" }),
    });
    expect(otherUser.status).toBe(404);
  });

  it("rejects an invalid create body", async () => {
    const response = await harness.app.request("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ company: "Acme" }),
    });
    expect(response.status).toBe(400);
  });
});
