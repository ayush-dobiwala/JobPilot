import { Hono } from "hono";
import type { ProfileStore } from "../services/profiles.js";
import type { AppEnv } from "../types.js";

export function createProfilesRouter(store: ProfileStore): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const profile = await store.get(c.get("clerkUserId"));
    return c.json(profile);
  });

  router.put("/", async (c) => {
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
    const asNullableString = (value: unknown): string | null | undefined => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      return typeof value === "string" ? value : undefined;
    };

    const input: {
      phone?: string | null;
      location?: string | null;
      linkedinUrl?: string | null;
      portfolioUrl?: string | null;
      workAuthStatus?: string | null;
    } = {};
    const phone = asNullableString(record.phone);
    const location = asNullableString(record.location);
    const linkedinUrl = asNullableString(record.linkedinUrl);
    const portfolioUrl = asNullableString(record.portfolioUrl);
    const workAuthStatus = asNullableString(record.workAuthStatus);
    if (phone !== undefined) input.phone = phone;
    if (location !== undefined) input.location = location;
    if (linkedinUrl !== undefined) input.linkedinUrl = linkedinUrl;
    if (portfolioUrl !== undefined) input.portfolioUrl = portfolioUrl;
    if (workAuthStatus !== undefined) input.workAuthStatus = workAuthStatus;

    const profile = await store.upsert(c.get("clerkUserId"), input);
    return c.json(profile);
  });

  return router;
}
