import { Hono } from "hono";
import {
  ApplicationNotFoundError,
  AutomationCancelError,
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

  router.post("/runs/:id/cancel", async (c) => {
    try {
      const run = await store.cancelRun(c.get("clerkUserId"), c.req.param("id"));
      return c.json(run);
    } catch (error) {
      if (error instanceof AutomationNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof AutomationCancelError) {
        return c.json({ error: error.message }, 409);
      }
      throw error;
    }
  });

  router.post("/wishlist", async (c) => {
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
    if (typeof record.url !== "string" || record.url.trim() === "") {
      return c.json({ error: "A job page URL is required" }, 400);
    }
    const url = record.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      return c.json({ error: "Job URL must start with http:// or https://" }, 400);
    }
    try {
      const result = await store.importWishlistFromUrl(c.get("clerkUserId"), url);
      return c.json(result, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save Wishlist job";
      return c.json({ error: message }, 502);
    }
  });

  router.delete("/runs/:id", async (c) => {
    try {
      const ok = await store.deleteRun(c.get("clerkUserId"), c.req.param("id"));
      if (!ok) {
        return c.json({ error: "Automation run not found" }, 404);
      }
      return c.json({ ok: true });
    } catch (error) {
      if (error instanceof AutomationCancelError) {
        return c.json({ error: error.message }, 409);
      }
      throw error;
    }
  });

  router.delete("/runs", async (c) => {
    const removed = await store.clearFinishedRuns(c.get("clerkUserId"));
    return c.json({ removed });
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
    if (typeof record.url === "string" && record.url.trim() !== "") {
      input.url = record.url.trim();
    }
    if (typeof record.query === "string" && record.query.trim() !== "") {
      input.query = record.query.trim();
    }
    if (!input.url && !input.query) {
      return c.json({ error: "A job page URL is required" }, 400);
    }
    if (input.url && !/^https?:\/\//i.test(input.url)) {
      return c.json({ error: "Job URL must start with http:// or https://" }, 400);
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
