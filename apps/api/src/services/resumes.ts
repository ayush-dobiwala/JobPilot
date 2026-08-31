import { and, desc, eq } from "drizzle-orm";
import type { Resume } from "@jobpilot/shared-types";
import type { Database } from "../db/client.js";
import { matchScoreRuns, resumes } from "../db/schema.js";
import { toResume } from "../lib/mappers.js";
import { safeResumeFilename } from "../lib/resumeParse.js";

export interface CreateResumeInput {
  parsedText: string;
  label?: string;
  isPrimary?: boolean;
  storagePath?: string;
  id?: string;
}

export interface UpdateResumeInput {
  label?: string;
  isPrimary?: boolean;
}

export interface ResumeStore {
  list(userId: string): Promise<Resume[]>;
  create(userId: string, input: CreateResumeInput): Promise<Resume>;
  update(userId: string, id: string, input: UpdateResumeInput): Promise<Resume | null>;
  delete(userId: string, id: string): Promise<boolean>;
  getOwned(userId: string, id: string): Promise<Resume | null>;
}

function normalizeLabel(label: string | undefined, fallback: string): string {
  const trimmed = label?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.slice(0, 120) : fallback;
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
          label: normalizeLabel(input.label, "My resume"),
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

    async update(userId, id, input) {
      const existing = await this.getOwned(userId, id);
      if (!existing) {
        return null;
      }
      if (input.isPrimary === true) {
        await db.update(resumes).set({ isPrimary: false }).where(eq(resumes.userId, userId));
      }
      const [row] = await db
        .update(resumes)
        .set({
          ...(input.label !== undefined
            ? { label: normalizeLabel(input.label, existing.label) }
            : {}),
          ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        })
        .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
        .returning();
      return row ? toResume(row) : null;
    },

    async delete(userId, id) {
      const existing = await this.getOwned(userId, id);
      if (!existing) {
        return false;
      }

      // Older resumes may be referenced by match history; clear links first so delete always works.
      await db
        .update(matchScoreRuns)
        .set({ resumeId: null })
        .where(and(eq(matchScoreRuns.userId, userId), eq(matchScoreRuns.resumeId, id)));

      const deleted = await db
        .delete(resumes)
        .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
        .returning({ id: resumes.id });
      return deleted.length > 0;
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
