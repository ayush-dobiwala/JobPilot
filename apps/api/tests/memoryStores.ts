import type {
  Application,
  ApplicationEvent,
  CreateApplicationRequest,
  ListApplicationsQuery,
  ListApplicationsResponse,
  UpdateApplicationRequest,
} from "@jobpilot/shared-types";
import type { ApplicationStore } from "../src/services/applications.js";
import type { UserStore } from "../src/services/users.js";

export class MemoryApplicationStore implements ApplicationStore {
  readonly applications = new Map<string, Application>();
  readonly events = new Map<string, ApplicationEvent[]>();

  async list(userId: string, query: ListApplicationsQuery): Promise<ListApplicationsResponse> {
    let rows = [...this.applications.values()].filter((row) => row.userId === userId);
    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }
    if (query.search) {
      const term = query.search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.company.toLowerCase().includes(term) || row.roleTitle.toLowerCase().includes(term),
      );
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    return {
      data: rows.slice(start, start + pageSize),
      page,
      pageSize,
      total: rows.length,
    };
  }

  async create(userId: string, input: CreateApplicationRequest): Promise<Application> {
    const now = new Date().toISOString();
    const status = input.status ?? "wishlist";
    const application: Application = {
      id: crypto.randomUUID(),
      userId,
      company: input.company,
      roleTitle: input.roleTitle,
      jobUrl: input.jobUrl ?? null,
      status,
      appliedAt: status === "applied" ? now : null,
      source: "manual",
      matchScore: null,
      notes: input.notes ?? null,
      salaryRange: input.salaryRange ?? null,
      createdAt: now,
    };
    this.applications.set(application.id, application);
    this.events.set(application.id, []);
    return application;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateApplicationRequest,
  ): Promise<Application | null> {
    const existing = this.applications.get(id);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    const updated: Application = {
      ...existing,
      company: input.company ?? existing.company,
      roleTitle: input.roleTitle ?? existing.roleTitle,
      jobUrl: input.jobUrl === undefined ? existing.jobUrl : input.jobUrl,
      status: input.status ?? existing.status,
      notes: input.notes === undefined ? existing.notes : input.notes,
      salaryRange: input.salaryRange === undefined ? existing.salaryRange : input.salaryRange,
      matchScore: input.matchScore === undefined ? existing.matchScore : input.matchScore,
      appliedAt:
        input.appliedAt === undefined
          ? input.status === "applied" && !existing.appliedAt
            ? new Date().toISOString()
            : existing.appliedAt
          : input.appliedAt,
    };

    if (input.status !== undefined && input.status !== existing.status) {
      const event: ApplicationEvent = {
        id: crypto.randomUUID(),
        applicationId: id,
        eventType: "status_change",
        payload: { from: existing.status, to: input.status },
        createdAt: new Date().toISOString(),
      };
      const list = this.events.get(id) ?? [];
      this.events.set(id, [event, ...list]);
    }

    this.applications.set(id, updated);
    return updated;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = this.applications.get(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }
    this.applications.delete(id);
    this.events.delete(id);
    return true;
  }

  async listEvents(userId: string, id: string): Promise<ApplicationEvent[] | null> {
    const existing = this.applications.get(id);
    if (!existing || existing.userId !== userId) {
      return null;
    }
    return this.events.get(id) ?? [];
  }
}

export class MemoryUserStore implements UserStore {
  readonly users = new Map<string, { id: string; email: string; name: string | null }>();

  async provision(input: { id: string; email: string; name: string | null }): Promise<void> {
    if (!this.users.has(input.id)) {
      this.users.set(input.id, input);
    }
  }
}
