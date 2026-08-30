import { Hono } from "hono";
import {
  MatchScoreLimitError,
  ResumeNotFoundError,
  type MatchScoreStore,
} from "../services/matchScore.js";
import type { AppEnv } from "../types.js";

function parseMatchBody(body: unknown): { resumeId: string; jobDescription: string } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.resumeId !== "string" || record.resumeId === "") {
    return null;
  }
  if (typeof record.jobDescription !== "string" || record.jobDescription.trim() === "") {
    return null;
  }
  return { resumeId: record.resumeId, jobDescription: record.jobDescription.trim() };
}

export function createMatchScoreRouter(store: MatchScoreStore): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/usage", async (c) => {
    const usage = await store.getUsage(c.get("clerkUserId"));
    return c.json(usage);
  });

  router.post("/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = parseMatchBody(body);
    if (!parsed) {
      return c.json({ error: "resumeId and jobDescription are required" }, 400);
    }

    try {
      const result = await store.score(
        c.get("clerkUserId"),
        parsed.resumeId,
        parsed.jobDescription,
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof MatchScoreLimitError) {
        return c.json({ error: error.message }, 402);
      }
      if (error instanceof ResumeNotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      const message = error instanceof Error ? error.message : "Match score failed";
      console.error("match-score failed:", message);
      return c.json({ error: message }, 502);
    }
  });

  return router;
}
