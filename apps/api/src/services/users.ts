import type { User } from "@jobpilot/shared-types";
import { eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { users } from "../db/schema.js";
import { toUser } from "../lib/mappers.js";

export interface ProvisionUserInput {
  id: string;
  email: string;
  name: string | null;
}

export interface UserStore {
  provision(input: ProvisionUserInput): Promise<void>;
  getById(id: string): Promise<User | null>;
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

    async getById(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return row ? toUser(row) : null;
    },
  };
}
