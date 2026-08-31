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
    input: { parsedText: string; isPrimary?: boolean; storagePath?: string; id?: string },
  ): Promise<Resume> {
    const id = input.id ?? crypto.randomUUID();
    const resume: Resume = {
      id,
      userId,
      storagePath: input.storagePath ?? `inline/${id}`,
      parsedText: input.parsedText,
      isPrimary: input.isPrimary ?? false,
      uploadedAt: new Date().toISOString(),
    };
    this.resumes.set(resume.id, resume);
    return resume;
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
  result: MatchScoreResponse = {
    score: 77,
    missingKeywords: ["kubernetes"],
    suggestions: ["Add metrics to bullet points"],
  };

  async getUsage(_userId: string): Promise<MatchScoreUsageResponse> {
    return { used: this.used, limit: this.limit, plan: this.plan };
  }

  async score(
    _userId: string,
    _resumeId: string,
    _jobDescription: string,
  ): Promise<MatchScoreResponse> {
    this.used += 1;
    return this.result;
  }
}
