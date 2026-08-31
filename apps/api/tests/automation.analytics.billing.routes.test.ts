import { describe, expect, it } from "vitest";
import { createTestApp } from "./testHelpers.js";

describe("automation routes", () => {
  it("queues a scrape job", async () => {
    const app = createTestApp();
    const response = await app.request("/api/automation/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user_1" },
      body: JSON.stringify({ query: "software engineer" }),
    });
    expect(response.status).toBe(202);
    const body = (await response.json()) as { runId: string };
    expect(body.runId).toBeTruthy();
  });

  it("lists runs", async () => {
    const app = createTestApp();
    await app.request("/api/automation/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user_1" },
      body: JSON.stringify({ query: "swe" }),
    });
    const response = await app.request("/api/automation/runs", {
      headers: { "x-user-id": "user_1" },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: unknown[] };
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("cancels a queued run", async () => {
    const app = createTestApp();
    const queued = await app.request("/api/automation/scrape", {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "user_1" },
      body: JSON.stringify({ query: "swe" }),
    });
    const { runId } = (await queued.json()) as { runId: string };

    const response = await app.request(`/api/automation/runs/${runId}/cancel`, {
      method: "POST",
      headers: { "x-user-id": "user_1" },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("canceled");
  });
});

describe("analytics routes", () => {
  it("returns summary and funnel", async () => {
    const app = createTestApp();
    const summary = await app.request("/api/analytics/summary", {
      headers: { "x-user-id": "user_1" },
    });
    const funnel = await app.request("/api/analytics/funnel", {
      headers: { "x-user-id": "user_1" },
    });
    expect(summary.status).toBe(200);
    expect(funnel.status).toBe(200);
  });
});

describe("billing routes", () => {
  it("creates checkout session", async () => {
    const app = createTestApp();
    const response = await app.request("/api/billing/checkout-session", {
      method: "POST",
      headers: { "x-user-id": "user_1" },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { url: string };
    expect(body.url).toContain("stripe");
  });
});
