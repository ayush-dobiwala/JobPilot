import { Hono } from "hono";
import type { ResolveClerkUser } from "../lib/clerkUser.js";
import type { UserStore } from "../services/users.js";
import type { AppEnv } from "../types.js";

export function createMeRouter(users: UserStore, resolveClerkUser: ResolveClerkUser): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const clerkUserId = c.get("clerkUserId");
    let user = await users.getById(clerkUserId);

    if (!user) {
      try {
        const profile = await resolveClerkUser(clerkUserId);
        await users.provision({
          id: clerkUserId,
          email: profile.email,
          name: profile.name,
        });
      } catch {
        return c.json({ error: "Could not provision user" }, 502);
      }
      user = await users.getById(clerkUserId);
    }

    if (!user) {
      return c.json({ error: "User is not provisioned" }, 404);
    }

    return c.json(user);
  });

  return router;
}
