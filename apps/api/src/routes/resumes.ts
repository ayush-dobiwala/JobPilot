import { Hono } from "hono";
import type { ResumeStore } from "../services/resumes.js";
import type { AppEnv } from "../types.js";

function parseCreateBody(body: unknown): { parsedText: string; isPrimary?: boolean } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.parsedText !== "string" || record.parsedText.trim() === "") {
    return null;
  }
  const result: { parsedText: string; isPrimary?: boolean } = {
    parsedText: record.parsedText.trim(),
  };
  if (typeof record.isPrimary === "boolean") {
    result.isPrimary = record.isPrimary;
  }
  return result;
}

export function createResumesRouter(store: ResumeStore): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const rows = await store.list(c.get("clerkUserId"));
    return c.json({ data: rows });
  });

  router.post("/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = parseCreateBody(body);
    if (!parsed) {
      return c.json({ error: "parsedText is required" }, 400);
    }
    const created = await store.create(c.get("clerkUserId"), parsed);
    return c.json(created, 201);
  });

  return router;
}
