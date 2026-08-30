import type { AnalyticsSummary, FunnelCounts } from "@jobpilot/shared-types";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { applicationEvents, applications } from "../db/schema.js";

export interface AnalyticsStore {
  getSummary(userId: string): Promise<AnalyticsSummary>;
  getFunnel(userId: string): Promise<FunnelCounts>;
}

function startOfUtcWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
}

export function createAnalyticsService(db: Database): AnalyticsStore {
  return {
    async getSummary(userId) {
      const weekStart = startOfUtcWeek();
      const [weekRow] = await db
        .select({ value: count() })
        .from(applications)
        .where(and(eq(applications.userId, userId), gte(applications.createdAt, weekStart)));

      const statusRows = await db
        .select({
          status: applications.status,
          value: count(),
        })
        .from(applications)
        .where(eq(applications.userId, userId))
        .groupBy(applications.status);

      const byStatus = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.value)])) as Record<
        string,
        number
      >;
      const applied = (byStatus.applied ?? 0) + (byStatus.interview ?? 0) + (byStatus.offer ?? 0) + (byStatus.rejected ?? 0);
      const responses = (byStatus.interview ?? 0) + (byStatus.offer ?? 0) + (byStatus.rejected ?? 0);
      const responseRate = applied === 0 ? 0 : Math.round((responses / applied) * 1000) / 10;

      const [interviewRow] = await db
        .select({ value: count() })
        .from(applicationEvents)
        .innerJoin(applications, eq(applicationEvents.applicationId, applications.id))
        .where(
          and(
            eq(applications.userId, userId),
            eq(applicationEvents.eventType, "interview_scheduled"),
            gte(applicationEvents.createdAt, weekStart),
          ),
        );

      const [avgRow] = await db
        .select({
          avgDays: sql<number | null>`avg(extract(epoch from (${applications.appliedAt} - ${applications.createdAt})) / 86400.0)`,
        })
        .from(applications)
        .where(
          and(
            eq(applications.userId, userId),
            inArray(applications.status, ["interview", "offer", "rejected"]),
            sql`${applications.appliedAt} is not null`,
          ),
        );

      return {
        applicationsThisWeek: Number(weekRow?.value ?? 0),
        responseRate,
        upcomingInterviews: Number(interviewRow?.value ?? 0),
        averageDaysToResponse:
          avgRow?.avgDays === null || avgRow?.avgDays === undefined
            ? null
            : Math.round(Number(avgRow.avgDays) * 10) / 10,
      };
    },

    async getFunnel(userId) {
      const rows = await db
        .select({
          status: applications.status,
          value: count(),
        })
        .from(applications)
        .where(eq(applications.userId, userId))
        .groupBy(applications.status);

      const byStatus = Object.fromEntries(rows.map((row) => [row.status, Number(row.value)])) as Partial<
        Record<keyof FunnelCounts, number>
      >;

      return {
        wishlist: byStatus.wishlist ?? 0,
        applied: byStatus.applied ?? 0,
        interview: byStatus.interview ?? 0,
        offer: byStatus.offer ?? 0,
        rejected: byStatus.rejected ?? 0,
      };
    },
  };
}
