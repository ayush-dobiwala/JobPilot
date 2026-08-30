import type { Profile, UpdateProfileRequest } from "@jobpilot/shared-types";
import { eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { profiles } from "../db/schema.js";
import { toProfile } from "../lib/mappers.js";

export interface ProfileStore {
  get(userId: string): Promise<Profile | null>;
  upsert(userId: string, input: UpdateProfileRequest): Promise<Profile>;
}

export function createProfilesService(db: Database): ProfileStore {
  return {
    async get(userId) {
      const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
      return row ? toProfile(row) : null;
    },

    async upsert(userId, input) {
      const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
      if (!existing) {
        const [created] = await db
          .insert(profiles)
          .values({
            userId,
            phone: input.phone ?? null,
            location: input.location ?? null,
            linkedinUrl: input.linkedinUrl ?? null,
            portfolioUrl: input.portfolioUrl ?? null,
            workAuthStatus: input.workAuthStatus ?? null,
          })
          .returning();
        if (!created) {
          throw new Error("Failed to create profile");
        }
        return toProfile(created);
      }

      const [updated] = await db
        .update(profiles)
        .set({
          phone: input.phone === undefined ? existing.phone : input.phone,
          location: input.location === undefined ? existing.location : input.location,
          linkedinUrl: input.linkedinUrl === undefined ? existing.linkedinUrl : input.linkedinUrl,
          portfolioUrl:
            input.portfolioUrl === undefined ? existing.portfolioUrl : input.portfolioUrl,
          workAuthStatus:
            input.workAuthStatus === undefined ? existing.workAuthStatus : input.workAuthStatus,
        })
        .where(eq(profiles.userId, userId))
        .returning();
      if (!updated) {
        throw new Error("Failed to update profile");
      }
      return toProfile(updated);
    },
  };
}
