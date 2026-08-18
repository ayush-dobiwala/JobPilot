import type {
  Application,
  ApplicationEvent,
  CreateApplicationRequest,
  ListApplicationsQuery,
  ListApplicationsResponse,
  UpdateApplicationRequest,
} from "@jobpilot/shared-types";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { applicationEvents, applications } from "../db/schema.js";
import { toApplication, toApplicationEvent } from "../lib/mappers.js";

export class UserNotProvisionedError extends Error {
  constructor() {
    super("User is not provisioned");
    this.name = "UserNotProvisionedError";
  }
}

export interface ApplicationStore {
  list(userId: string, query: ListApplicationsQuery): Promise<ListApplicationsResponse>;
  create(userId: string, input: CreateApplicationRequest): Promise<Application>;
  update(userId: string, id: string, input: UpdateApplicationRequest): Promise<Application | null>;
  delete(userId: string, id: string): Promise<boolean>;
  listEvents(userId: string, id: string): Promise<ApplicationEvent[] | null>;
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23503"
  );
}

export function createApplicationsService(db: Database): ApplicationStore {
  return {
    async list(userId, query) {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      const filters: SQL[] = [eq(applications.userId, userId)];

      if (query.status) {
        filters.push(eq(applications.status, query.status));
      }

      if (query.search) {
        const term = `%${query.search}%`;
        const searchFilter = or(
          ilike(applications.company, term),
          ilike(applications.roleTitle, term),
        );
        if (searchFilter) {
          filters.push(searchFilter);
        }
      }

      const where = and(...filters);
      const offset = (page - 1) * pageSize;

      const [rows, totalRows] = await Promise.all([
        db
          .select()
          .from(applications)
          .where(where)
          .orderBy(desc(applications.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ value: count() }).from(applications).where(where),
      ]);

      const total = Number(totalRows[0]?.value ?? 0);

      return {
        data: rows.map(toApplication),
        page,
        pageSize,
        total,
      };
    },

    async create(userId, input) {
      const status = input.status ?? "wishlist";
      const appliedAt = status === "applied" ? new Date() : null;

      try {
        const [row] = await db
          .insert(applications)
          .values({
            userId,
            company: input.company,
            roleTitle: input.roleTitle,
            status,
            appliedAt,
            source: "manual",
            ...(input.jobUrl !== undefined ? { jobUrl: input.jobUrl } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.salaryRange !== undefined ? { salaryRange: input.salaryRange } : {}),
          })
          .returning();

        if (!row) {
          throw new Error("Failed to create application");
        }

        return toApplication(row);
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          throw new UserNotProvisionedError();
        }
        throw error;
      }
    },

    async update(userId, id, input) {
      const [existing] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, id), eq(applications.userId, userId)))
        .limit(1);

      if (!existing) {
        return null;
      }

      const appliedAt =
        input.appliedAt === undefined
          ? input.status === "applied" && !existing.appliedAt
            ? new Date()
            : existing.appliedAt
          : input.appliedAt === null
            ? null
            : new Date(input.appliedAt);

      const [row] = await db
        .update(applications)
        .set({
          company: input.company ?? existing.company,
          roleTitle: input.roleTitle ?? existing.roleTitle,
          jobUrl: input.jobUrl === undefined ? existing.jobUrl : input.jobUrl,
          status: input.status ?? existing.status,
          notes: input.notes === undefined ? existing.notes : input.notes,
          salaryRange: input.salaryRange === undefined ? existing.salaryRange : input.salaryRange,
          matchScore: input.matchScore === undefined ? existing.matchScore : input.matchScore,
          appliedAt,
        })
        .where(and(eq(applications.id, id), eq(applications.userId, userId)))
        .returning();

      if (!row) {
        return null;
      }

      if (input.status !== undefined && input.status !== existing.status) {
        await db.insert(applicationEvents).values({
          applicationId: id,
          eventType: "status_change",
          payload: { from: existing.status, to: input.status },
        });
      }

      return toApplication(row);
    },

    async delete(userId, id) {
      const deleted = await db
        .delete(applications)
        .where(and(eq(applications.id, id), eq(applications.userId, userId)))
        .returning({ id: applications.id });

      return deleted.length > 0;
    },

    async listEvents(userId, id) {
      const [owned] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, id), eq(applications.userId, userId)))
        .limit(1);

      if (!owned) {
        return null;
      }

      const rows = await db
        .select()
        .from(applicationEvents)
        .where(eq(applicationEvents.applicationId, id))
        .orderBy(desc(applicationEvents.createdAt));

      return rows.map(toApplicationEvent);
    },
  };
}
