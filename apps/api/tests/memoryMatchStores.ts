import type { MatchScoreResponse, MatchScoreUsageResponse, Resume } from "@jobpilot/shared-types";
import type { MatchScoreStore } from "../src/services/matchScore.js";
import type { ResumeStore } from "../src/services/resumes.js";

export class MemoryResumeStore implements ResumeStore {
  readonly resumes = new Map<string, Resume>();

  async list(userId: string): Promise<Resume[]> {
    return [...this.resumes.values()].filter((row) => row.userId === userId);
  }

  async create(
    userId: string,
    input: {
      parsedText: string;
      label?: string;
      isPrimary?: boolean;
      storagePath?: string;
      id?: string;
    },
  ): Promise<Resume> {
    const id = input.id ?? crypto.randomUUID();
    const resume: Resume = {
      id,
      userId,
      label: input.label?.trim() || "My resume",
      storagePath: input.storagePath ?? `inline/${id}`,
      parsedText: input.parsedText,
      isPrimary: input.isPrimary ?? false,
      uploadedAt: new Date().toISOString(),
    };
    this.resumes.set(resume.id, resume);
    return resume;
  }

  async update(
    userId: string,
    id: string,
    input: { label?: string; isPrimary?: boolean },
  ): Promise<Resume | null> {
    const row = this.resumes.get(id);
    if (!row || row.userId !== userId) {
      return null;
    }
    if (input.isPrimary === true) {
      for (const resume of this.resumes.values()) {
        if (resume.userId === userId) {
          resume.isPrimary = false;
        }
      }
    }
    const updated: Resume = {
      ...row,
      ...(input.label !== undefined ? { label: input.label.trim() || row.label } : {}),
      ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
    };
    this.resumes.set(id, updated);
    return updated;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const row = this.resumes.get(id);
    if (!row || row.userId !== userId) {
      return false;
    }
    return this.resumes.delete(id);
  }

  async getOwned(userId: string, id: string): Promise<Resume | null> {
    const row = this.resumes.get(id);
    if (!row || row.userId !== userId) {
      return null;
    }
    return row;
  }
}

export class MemoryMatchScoreStore implements MatchScoreStore {
  used = 0;
  limit: number | null = 5;
  plan: "free" | "pro" = "free";

  async getUsage(): Promise<MatchScoreUsageResponse> {
    return { used: this.used, limit: this.limit, plan: this.plan };
  }

  async score(
    _userId: string,
    _resumeId: string,
    _jobDescription: string,
  ): Promise<MatchScoreResponse> {
    this.used += 1;
    return {
      score: 77,
      missingKeywords: ["kubernetes"],
      suggestions: ["Add a Kubernetes bullet"],
    };
  }
}
