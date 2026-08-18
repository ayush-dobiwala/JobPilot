import { Hono } from "hono";
import type { UserStore } from "../services/users.js";
import type { AppEnv } from "../types.js";

export function createMeRouter(users: UserStore): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const user = await users.getById(c.get("clerkUserId"));
    if (!user) {
      return c.json({ error: "User is not provisioned" }, 404);
    }
    return c.json(user);
  });

  return router;
}
