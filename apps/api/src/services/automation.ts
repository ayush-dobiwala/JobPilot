import type {
  AutomationLogEntry,
  AutomationRun,
  AutofillJobRequest,
  QueueJobResponse,
  ScrapeJobRequest,
} from "@jobpilot/shared-types";
import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import {
  applicationEvents,
  applications,
  automationRuns,
  profiles,
  scrapedJobs,
  users,
} from "../db/schema.js";
import { toAutomationRun } from "../lib/mappers.js";
import type { JobQueue } from "../queue/types.js";

export class AutomationNotFoundError extends Error {
  constructor() {
    super("Automation run not found");
    this.name = "AutomationNotFoundError";
  }
}

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("Application not found");
    this.name = "ApplicationNotFoundError";
  }
}

export class AutomationCancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationCancelError";
  }
}

export interface AutomationStore {
  listRuns(userId: string): Promise<AutomationRun[]>;
  getRun(userId: string, runId: string): Promise<AutomationRun | null>;
  enqueueScrape(userId: string, input: ScrapeJobRequest): Promise<QueueJobResponse>;
  enqueueAutofill(userId: string, input: AutofillJobRequest): Promise<QueueJobResponse>;
  confirmSubmit(userId: string, runId: string): Promise<AutomationRun>;
  cancelRun(userId: string, runId: string): Promise<AutomationRun>;
}

type WorkerLog = {
  step: string;
  message: string;
  timestamp?: string;
  screenshotUrl?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function absoluteWorkerUrl(workerBaseUrl: string, maybeRelative: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) {
    return maybeRelative;
  }
  const base = workerBaseUrl.replace(/\/$/, "");
  return maybeRelative.startsWith("/") ? `${base}${maybeRelative}` : `${base}/${maybeRelative}`;
}

function normalizeLogs(logs: WorkerLog[], screenshotBase64?: string | null): AutomationLogEntry[] {
  const mapped = logs.map((log) => ({
    step: log.step,
    message: log.message,
    timestamp: log.timestamp ?? nowIso(),
    ...(log.screenshotUrl ? { screenshotUrl: log.screenshotUrl } : {}),
  }));
  if (screenshotBase64) {
    mapped.push({
      step: "screenshot",
      message: "Captured filled form screenshot (submit not clicked)",
      timestamp: nowIso(),
      screenshotUrl: `data:image/png;base64,${screenshotBase64}`,
    });
  }
  return mapped;
}

export function createAutomationService(
  db: Database,
  queue: JobQueue,
  workerBaseUrl: string,
): AutomationStore {
  async function callWorker<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${workerBaseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Worker error (${response.status}): ${text.slice(0, 200)}`);
    }
    return (await response.json()) as T;
  }

  return {
    async listRuns(userId) {
      const rows = await db
        .select()
        .from(automationRuns)
        .where(eq(automationRuns.userId, userId))
        .orderBy(desc(automationRuns.startedAt), desc(automationRuns.id))
        .limit(50);
      return rows.map(toAutomationRun);
    },

    async getRun(userId, runId) {
      const [row] = await db
        .select()
        .from(automationRuns)
        .where(and(eq(automationRuns.id, runId), eq(automationRuns.userId, userId)))
        .limit(1);
      return row ? toAutomationRun(row) : null;
    },

    async enqueueScrape(userId, input) {
      const [run] = await db
        .insert(automationRuns)
        .values({
          userId,
          type: "scrape",
          status: "queued",
          logs: [{ step: "queued", message: "Job search queued", timestamp: nowIso() }],
        })
        .returning();

      if (!run) {
        throw new Error("Failed to create scrape run");
      }

      await queue.add("scrape", {
        runId: run.id,
        userId,
        type: "scrape",
        query: input.query ?? null,
        url: input.url ?? null,
      });

      return { runId: run.id };
    },

    async enqueueAutofill(userId, input) {
      const [app] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, userId)))
        .limit(1);
      if (!app) {
        throw new ApplicationNotFoundError();
      }

      const [run] = await db
        .insert(automationRuns)
        .values({
          userId,
          applicationId: input.applicationId,
          type: "autofill",
          status: "queued",
          logs: [{ step: "queued", message: "Autofill queued", timestamp: nowIso() }],
        })
        .returning();

      if (!run) {
        throw new Error("Failed to create autofill run");
      }

      await queue.add("autofill", {
        runId: run.id,
        userId,
        type: "autofill",
        applicationId: input.applicationId,
        formUrl: input.formUrl,
      });

      return { runId: run.id };
    },

    async confirmSubmit(userId, runId) {
      const run = await this.getRun(userId, runId);
      if (!run) {
        throw new AutomationNotFoundError();
      }
      if (!run.applicationId) {
        throw new ApplicationNotFoundError();
      }

      const [app] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, run.applicationId), eq(applications.userId, userId)))
        .limit(1);
      if (!app) {
        throw new ApplicationNotFoundError();
      }

      const previousStatus = app.status;
      const appliedAt = new Date();

      await db
        .update(applications)
        .set({
          status: "applied",
          appliedAt,
          source: "automation",
        })
        .where(eq(applications.id, app.id));

      if (previousStatus !== "applied") {
        await db.insert(applicationEvents).values({
          applicationId: app.id,
          eventType: "status_change",
          payload: {
            from: previousStatus,
            to: "applied",
            via: "automation_confirm",
            company: app.company,
            roleTitle: app.roleTitle,
          },
        });
      }

      const reviewLog = run.logs.find((log) => log.step === "review_url");
      const formUrlLog = run.logs.find((log) => log.step === "form_url");
      const formUrl =
        reviewLog?.message.replace(/^Review URL:\s*/, "") ||
        formUrlLog?.message.replace(/^Form URL:\s*/, "") ||
        `${workerBaseUrl.replace(/\/$/, "")}/fixtures/demo-apply.html`;

      let workerLogs: AutomationLogEntry[] = [];
      try {
        const result = await callWorker<{ logs: WorkerLog[] }>("/confirm-submit", { formUrl });
        workerLogs = normalizeLogs(result.logs);
      } catch {
        workerLogs = [
          {
            step: "worker_confirm",
            message:
              "Worker confirm skipped — application already marked Applied from your review.",
            timestamp: nowIso(),
          },
        ];
      }

      const logs = [
        ...run.logs,
        ...workerLogs,
        {
          step: "marked_applied",
          message: `Moved ${app.company} — ${app.roleTitle} to Applied on your board.`,
          timestamp: nowIso(),
        },
      ];

      const [updated] = await db
        .update(automationRuns)
        .set({
          logs,
          status: "success",
          finishedAt: new Date(),
        })
        .where(and(eq(automationRuns.id, runId), eq(automationRuns.userId, userId)))
        .returning();

      if (!updated) {
        throw new AutomationNotFoundError();
      }
      return toAutomationRun(updated);
    },

    async cancelRun(userId, runId) {
      const run = await this.getRun(userId, runId);
      if (!run) {
        throw new AutomationNotFoundError();
      }
      if (run.status !== "queued" && run.status !== "running") {
        throw new AutomationCancelError("Only queued or running jobs can be stopped");
      }

      const logs = [
        ...run.logs,
        {
          step: "canceled",
          message: "Stopped by you — this job will not continue.",
          timestamp: nowIso(),
        },
      ];

      const [updated] = await db
        .update(automationRuns)
        .set({
          status: "canceled",
          finishedAt: new Date(),
          logs,
        })
        .where(and(eq(automationRuns.id, runId), eq(automationRuns.userId, userId)))
        .returning();

      if (!updated) {
        throw new AutomationNotFoundError();
      }
      return toAutomationRun(updated);
    },
  };
}

export async function processAutomationJob(
  db: Database,
  workerBaseUrl: string,
  job: {
    runId: string;
    userId: string;
    type: "scrape" | "autofill";
    query?: string | null;
    url?: string | null;
    applicationId?: string | null;
    formUrl?: string | null;
  },
): Promise<void> {
  const [existing] = await db
    .select({ status: automationRuns.status, logs: automationRuns.logs })
    .from(automationRuns)
    .where(eq(automationRuns.id, job.runId))
    .limit(1);

  if (!existing || existing.status === "canceled") {
    return;
  }

  const startedAt = new Date();
  await db
    .update(automationRuns)
    .set({
      status: "running",
      startedAt,
      logs: [
        ...existing.logs,
        { step: "running", message: "Worker started", timestamp: startedAt.toISOString() },
      ],
    })
    .where(and(eq(automationRuns.id, job.runId), eq(automationRuns.status, "queued")));

  const [claimed] = await db
    .select({ status: automationRuns.status })
    .from(automationRuns)
    .where(eq(automationRuns.id, job.runId))
    .limit(1);
  if (!claimed || claimed.status !== "running") {
    return;
  }

  try {
    if (job.type === "scrape") {
      const response = await fetch(`${workerBaseUrl.replace(/\/$/, "")}/scrape`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: job.query ?? null, url: job.url ?? null }),
      });
      if (!response.ok) {
        throw new Error(`Scrape failed (${response.status})`);
      }
      const body = (await response.json()) as {
        jobs: Array<{ title: string; company: string; url: string; description?: string | null }>;
        logs: WorkerLog[];
      };

      const created: string[] = [];
      for (const scraped of body.jobs) {
        const jobUrl = absoluteWorkerUrl(workerBaseUrl, scraped.url);
        await db.insert(scrapedJobs).values({
          source: "generic",
          title: scraped.title,
          company: scraped.company,
          description: scraped.description ?? null,
          url: jobUrl,
          raw: scraped as unknown as Record<string, unknown>,
        });

        const [app] = await db
          .insert(applications)
          .values({
            userId: job.userId,
            company: scraped.company,
            roleTitle: scraped.title,
            jobUrl,
            status: "wishlist",
            source: "automation",
            notes: scraped.description ?? null,
          })
          .returning();
        if (app) {
          created.push(`${app.company} — ${app.roleTitle}`);
        }
      }

      const logs = normalizeLogs(body.logs);
      await db
        .update(automationRuns)
        .set({
          status: "success",
          finishedAt: new Date(),
          logs: [
            ...logs,
            {
              step: "persisted",
              message: `Saved ${body.jobs.length} listing(s)`,
              timestamp: nowIso(),
            },
            {
              step: "board_import",
              message:
                created.length > 0
                  ? `Added to Wishlist: ${created.join("; ")}`
                  : "No applications created",
              timestamp: nowIso(),
            },
          ],
        })
        .where(and(eq(automationRuns.id, job.runId), eq(automationRuns.status, "running")));
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, job.userId)).limit(1);
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, job.userId))
      .limit(1);
    const [app] = job.applicationId
      ? await db.select().from(applications).where(eq(applications.id, job.applicationId)).limit(1)
      : [undefined];

    const formUrl = absoluteWorkerUrl(
      workerBaseUrl,
      job.formUrl ?? app?.jobUrl ?? `${workerBaseUrl.replace(/\/$/, "")}/fixtures/demo-apply.html`,
    );

    const coverLetter =
      app != null
        ? `Hello ${app.company} hiring team,\n\nI'm excited to apply for the ${app.roleTitle} role. Thank you for considering my application.\n\nPrepared with JobPilot — I will review this form before submitting.`
        : "Excited to apply. Prepared with JobPilot — I will review this form before submitting.";

    const response = await fetch(`${workerBaseUrl.replace(/\/$/, "")}/autofill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formUrl,
        company: app?.company ?? null,
        roleTitle: app?.roleTitle ?? null,
        applicant: {
          name: user?.name ?? "JobPilot Candidate",
          email: user?.email ?? "candidate@example.com",
          phone: profile?.phone ?? null,
          linkedinUrl: profile?.linkedinUrl ?? null,
          portfolioUrl: profile?.portfolioUrl ?? null,
          workAuthStatus: profile?.workAuthStatus ?? null,
          coverLetter,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Autofill failed (${response.status})`);
    }
    const body = (await response.json()) as {
      logs: WorkerLog[];
      screenshotBase64?: string | null;
      filledFields?: Record<string, string>;
      reviewUrl?: string | null;
    };

    const reviewUrl = body.reviewUrl ?? formUrl;
    const logs = [
      { step: "form_url", message: `Form URL: ${formUrl}`, timestamp: nowIso() },
      { step: "review_url", message: `Review URL: ${reviewUrl}`, timestamp: nowIso() },
      ...(body.filledFields
        ? [
            {
              step: "filled_fields",
              message: JSON.stringify(body.filledFields),
              timestamp: nowIso(),
            },
          ]
        : []),
      ...normalizeLogs(body.logs, body.screenshotBase64),
      {
        step: "awaiting_confirm",
        message:
          "Form prepared. Open the review link, submit yourself if everything looks right, then mark Applied here.",
        timestamp: nowIso(),
      },
    ];

    await db
      .update(automationRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        logs,
      })
      .where(and(eq(automationRuns.id, job.runId), eq(automationRuns.status, "running")));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown automation error";
    await db
      .update(automationRuns)
      .set({
        status: "failed",
        finishedAt: new Date(),
        logs: [{ step: "failed", message, timestamp: nowIso() }],
      })
      .where(and(eq(automationRuns.id, job.runId), eq(automationRuns.status, "running")));
  }
}
