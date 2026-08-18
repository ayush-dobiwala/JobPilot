import { eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { users } from "../db/schema.js";

export interface ProvisionUserInput {
  id: string;
  email: string;
  name: string | null;
}

export interface UserStore {
  provision(input: ProvisionUserInput): Promise<void>;
}

export function createUsersService(db: Database): UserStore {
  return {
    async provision(input) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (existing) {
        return;
      }

      await db.insert(users).values({
        id: input.id,
        email: input.email,
        name: input.name,
        plan: "free",
      });
    },
  };
}
