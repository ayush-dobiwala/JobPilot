import type { MiddlewareHandler } from "hono";
import { createApp, type CreateAppOptions } from "../src/app.js";
import type { AppEnv } from "../src/types.js";
import { MemoryMatchScoreStore, MemoryResumeStore } from "./memoryMatchStores.js";
import { MemoryApplicationStore, MemoryUserStore } from "./memoryStores.js";
import type { AnalyticsStore } from "../src/services/analytics.js";
import {
  AutomationCancelError,
  AutomationNotFoundError,
  type AutomationStore,
} from "../src/services/automation.js";
import type { BillingStore } from "../src/services/billing.js";
import type { ProfileStore } from "../src/services/profiles.js";
import type {
  AnalyticsSummary,
  AutomationRun,
  FunnelCounts,
  Profile,
  QueueJobResponse,
  Subscription,
} from "@jobpilot/shared-types";

export const passthroughAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("clerkUserId", c.req.header("x-user-id") ?? "user_test");
  await next();
};

export const passthroughRateLimit: MiddlewareHandler<AppEnv> = async (_c, next) => {
  await next();
};

class MemoryAutomationStore implements AutomationStore {
  private runs = new Map<string, AutomationRun>();

  async listRuns(userId: string) {
    return [...this.runs.values()].filter((run) => run.userId === userId);
  }

  async getRun(userId: string, runId: string) {
    const run = this.runs.get(runId);
    return run?.userId === userId ? run : null;
  }

  async enqueueScrape(userId: string): Promise<QueueJobResponse> {
    const runId = crypto.randomUUID();
    this.runs.set(runId, {
      id: runId,
      userId,
      applicationId: null,
      type: "scrape",
      status: "queued",
      logs: [],
      startedAt: null,
      finishedAt: null,
    });
    return { runId };
  }

  async enqueueAutofill(
    userId: string,
    input: { applicationId: string },
  ): Promise<QueueJobResponse> {
    const runId = crypto.randomUUID();
    this.runs.set(runId, {
      id: runId,
      userId,
      applicationId: input.applicationId,
      type: "autofill",
      status: "queued",
      logs: [],
      startedAt: null,
      finishedAt: null,
    });
    return { runId };
  }

  async confirmSubmit(userId: string, runId: string) {
    const run = await this.getRun(userId, runId);
    if (!run) {
      throw new Error("Automation run not found");
    }
    const updated = { ...run, status: "success" as const };
    this.runs.set(runId, updated);
    return updated;
  }

  async cancelRun(userId: string, runId: string) {
    const run = await this.getRun(userId, runId);
    if (!run) {
      throw new AutomationNotFoundError();
    }
    if (run.status !== "queued" && run.status !== "running") {
      throw new AutomationCancelError("Only queued or running jobs can be stopped");
    }
    const updated = {
      ...run,
      status: "canceled" as const,
      finishedAt: new Date().toISOString(),
      logs: [
        ...run.logs,
        {
          step: "canceled",
          message: "Stopped by you — this job will not continue.",
          timestamp: new Date().toISOString(),
        },
      ],
    };
    this.runs.set(runId, updated);
    return updated;
  }
}

class MemoryAnalyticsStore implements AnalyticsStore {
  async getSummary(): Promise<AnalyticsSummary> {
    return {
      applicationsThisWeek: 0,
      responseRate: 0,
      upcomingInterviews: 0,
      averageDaysToResponse: null,
    };
  }

  async getFunnel(): Promise<FunnelCounts> {
    return { wishlist: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
  }
}

class MemoryBillingStore implements BillingStore {
  async getSubscription(): Promise<Subscription | null> {
    return null;
  }

  async createCheckoutSession() {
    return { url: "https://checkout.stripe.test/session" };
  }

  async createPortalSession() {
    return { url: "https://billing.stripe.test/portal" };
  }

  async handleStripeEvent() {
    return;
  }
}

class MemoryProfileStore implements ProfileStore {
  private profile: Profile | null = null;

  async get() {
    return this.profile;
  }

  async upsert(_userId: string, input: Partial<Profile>) {
    this.profile = {
      userId: "user_test",
      phone: input.phone ?? null,
      location: input.location ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      portfolioUrl: input.portfolioUrl ?? null,
      workAuthStatus: input.workAuthStatus ?? null,
    };
    return this.profile;
  }
}

export function createTestApp(overrides: Partial<CreateAppOptions> = {}) {
  return createApp({
    applications: new MemoryApplicationStore(),
    users: new MemoryUserStore(),
    resumes: new MemoryResumeStore(),
    matchScore: new MemoryMatchScoreStore(),
    automation: new MemoryAutomationStore(),
    analytics: new MemoryAnalyticsStore(),
    billing: new MemoryBillingStore(),
    profiles: new MemoryProfileStore(),
    requireAuth: passthroughAuth,
    rateLimit: passthroughRateLimit,
    verifyClerkWebhook: (payload) => JSON.parse(payload) as unknown,
    verifyStripeWebhook: () => ({ type: "test" }),
    ...overrides,
  });
}
