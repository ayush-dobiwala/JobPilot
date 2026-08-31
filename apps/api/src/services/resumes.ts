import { and, desc, eq } from "drizzle-orm";
import type { Resume } from "@jobpilot/shared-types";
import type { Database } from "../db/client.js";
import { resumes } from "../db/schema.js";
import { toResume } from "../lib/mappers.js";
import { safeResumeFilename } from "../lib/resumeParse.js";

export interface CreateResumeInput {
  parsedText: string;
  isPrimary?: boolean;
  storagePath?: string;
  id?: string;
}

export interface ResumeStore {
  list(userId: string): Promise<Resume[]>;
  create(userId: string, input: CreateResumeInput): Promise<Resume>;
  getOwned(userId: string, id: string): Promise<Resume | null>;
}

export function createResumesService(db: Database): ResumeStore {
  return {
    async list(userId) {
      const rows = await db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, userId))
        .orderBy(desc(resumes.isPrimary), desc(resumes.uploadedAt));
      return rows.map(toResume);
    },

    async create(userId, input) {
      const id = input.id ?? crypto.randomUUID();
      if (input.isPrimary) {
        await db.update(resumes).set({ isPrimary: false }).where(eq(resumes.userId, userId));
      }
      const storagePath = input.storagePath?.trim() || `inline/${id}`;
      const [row] = await db
        .insert(resumes)
        .values({
          id,
          userId,
          storagePath,
          parsedText: input.parsedText.trim(),
          isPrimary: input.isPrimary ?? false,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to create resume");
      }
      return toResume(row);
    },

    async getOwned(userId, id) {
      const [row] = await db
        .select()
        .from(resumes)
        .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
        .limit(1);
      return row ? toResume(row) : null;
    },
  };
}

export function buildUploadStoragePath(userId: string, resumeId: string, filename: string): string {
  return `upload/${userId}/${resumeId}-${safeResumeFilename(filename)}`;
}
