import { FREE_TIER_MATCH_SCORES_PER_MONTH, type MatchScoreResponse } from "@jobpilot/shared-types";
import { and, count, eq, gte } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { matchScoreRuns, users } from "../db/schema.js";
import type { MatchScorer } from "./matchScorer.js";
import type { ResumeStore } from "./resumes.js";

export class MatchScoreLimitError extends Error {
  constructor() {
    super("Free tier match score limit reached for this month");
    this.name = "MatchScoreLimitError";
  }
}

export class ResumeNotFoundError extends Error {
  constructor() {
    super("Resume not found");
    this.name = "ResumeNotFoundError";
  }
}

function startOfUtcMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export interface MatchScoreStore {
  getUsage(userId: string): Promise<{ used: number; limit: number | null; plan: "free" | "pro" }>;
  score(userId: string, resumeId: string, jobDescription: string): Promise<MatchScoreResponse>;
}

export function createMatchScoreService(
  db: Database,
  resumes: ResumeStore,
  scorer: MatchScorer,
): MatchScoreStore {
  return {
    async getUsage(userId) {
      const [user] = await db
        .select({ plan: users.plan })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const plan = user?.plan ?? "free";
      const monthStart = startOfUtcMonth();
      const [usageRow] = await db
        .select({ value: count() })
        .from(matchScoreRuns)
        .where(and(eq(matchScoreRuns.userId, userId), gte(matchScoreRuns.createdAt, monthStart)));

      const used = Number(usageRow?.value ?? 0);
      const limit = plan === "pro" ? null : FREE_TIER_MATCH_SCORES_PER_MONTH;
      return { used, limit, plan };
    },

    async score(userId, resumeId, jobDescription) {
      const usage = await this.getUsage(userId);
      if (usage.limit !== null && usage.used >= usage.limit) {
        throw new MatchScoreLimitError();
      }

      const resume = await resumes.getOwned(userId, resumeId);
      if (!resume?.parsedText?.trim()) {
        throw new ResumeNotFoundError();
      }

      const result = await scorer.score(resume.parsedText, jobDescription.trim());

      await db.insert(matchScoreRuns).values({
        userId,
        resumeId,
        jobDescription: jobDescription.trim(),
        score: result.score,
        missingKeywords: result.missingKeywords,
        suggestions: result.suggestions,
      });

      return result;
    },
  };
}
