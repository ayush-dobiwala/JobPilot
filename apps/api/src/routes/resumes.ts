import { Hono } from "hono";
import { extractResumeText, ResumeParseError } from "../lib/resumeParse.js";
import { buildUploadStoragePath, type ResumeStore } from "../services/resumes.js";
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

  router.post("/upload", async (c) => {
    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return c.json({ error: "Expected multipart form upload" }, 400);
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return c.json({ error: "file is required (PDF or Word .docx)" }, 400);
    }

    const isPrimaryRaw = form.get("isPrimary");
    const isPrimary =
      typeof isPrimaryRaw === "string" && (isPrimaryRaw === "true" || isPrimaryRaw === "1");

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsedText = await extractResumeText(file.name, buffer);
      const userId = c.get("clerkUserId");
      const id = crypto.randomUUID();
      const created = await store.create(userId, {
        id,
        parsedText,
        isPrimary,
        storagePath: buildUploadStoragePath(userId, id, file.name),
      });
      return c.json(created, 201);
    } catch (error) {
      if (error instanceof ResumeParseError) {
        return c.json({ error: error.message }, 400);
      }
      const message = error instanceof Error ? error.message : "Failed to parse resume";
      return c.json({ error: message }, 400);
    }
  });

  return router;
}
