import { Hono } from "hono";
import {
  ApplicationNotFoundError,
  AutomationNotFoundError,
  type AutomationStore,
} from "../services/automation.js";
import type { AppEnv } from "../types.js";

export function createAutomationRouter(store: AutomationStore): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/runs", async (c) => {
    const data = await store.listRuns(c.get("clerkUserId"));
    return c.json({ data });
  });

  router.get("/runs/:id", async (c) => {
    const run = await store.getRun(c.get("clerkUserId"), c.req.param("id"));
    if (!run) {
      return c.json({ error: "Automation run not found" }, 404);
    }
    return c.json(run);
  });

  router.post("/scrape", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    if (typeof body !== "object" || body === null) {
      return c.json({ error: "Invalid body" }, 400);
    }
    const record = body as Record<string, unknown>;
    const input: { url?: string; query?: string } = {};
    if (typeof record.url === "string") {
      input.url = record.url;
    }
    if (typeof record.query === "string") {
      input.query = record.query;
    }
    if (!input.url && !input.query) {
      return c.json({ error: "url or query is required" }, 400);
    }
    const result = await store.enqueueScrape(c.get("clerkUserId"), input);
    return c.json(result, 202);
  });

  router.post("/autofill", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    if (typeof body !== "object" || body === null) {
      return c.json({ error: "Invalid body" }, 400);
    }
    const record = body as Record<string, unknown>;
    if (typeof record.applicationId !== "string" || typeof record.formUrl !== "string") {
      return c.json({ error: "applicationId and formUrl are required" }, 400);
    }
    try {
      const result = await store.enqueueAutofill(c.get("clerkUserId"), {
        applicationId: record.applicationId,
        formUrl: record.formUrl,
      });
      return c.json(result, 202);
    } catch (error) {
      if (error instanceof ApplicationNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  router.post("/runs/:id/confirm-submit", async (c) => {
    try {
      const run = await store.confirmSubmit(c.get("clerkUserId"), c.req.param("id"));
      return c.json(run);
    } catch (error) {
      if (error instanceof AutomationNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  return router;
}
