import { Hono } from "hono";
import { UserNotProvisionedError, type ApplicationStore } from "../services/applications.js";
import { parseCreateBody, parseListQuery, parseUpdateBody } from "../lib/applicationsParse.js";
import type { AppEnv } from "../types.js";

export function createApplicationsRouter(store: ApplicationStore): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const parsed = parseListQuery(c.req.query());
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400);
    }

    const result = await store.list(c.get("clerkUserId"), parsed.value);
    return c.json(result);
  });

  router.post("/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = parseCreateBody(body);
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400);
    }

    try {
      const created = await store.create(c.get("clerkUserId"), parsed.value);
      return c.json(created, 201);
    } catch (error) {
      if (error instanceof UserNotProvisionedError) {
        return c.json({ error: error.message }, 409);
      }
      throw error;
    }
  });

  router.patch("/:id", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = parseUpdateBody(body);
    if (!parsed.ok) {
      return c.json({ error: parsed.error }, 400);
    }

    const updated = await store.update(c.get("clerkUserId"), c.req.param("id"), parsed.value);
    if (!updated) {
      return c.json({ error: "Application not found" }, 404);
    }
    return c.json(updated);
  });

  router.delete("/:id", async (c) => {
    const deleted = await store.delete(c.get("clerkUserId"), c.req.param("id"));
    if (!deleted) {
      return c.json({ error: "Application not found" }, 404);
    }
    return c.body(null, 204);
  });

  router.get("/:id/events", async (c) => {
    const events = await store.listEvents(c.get("clerkUserId"), c.req.param("id"));
    if (!events) {
      return c.json({ error: "Application not found" }, 404);
    }
    return c.json({ data: events });
  });

  return router;
}
