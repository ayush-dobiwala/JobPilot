import type {
  AutomationLogEntry,
  AutomationRun,
  AutofillJobRequest,
  QueueJobResponse,
  ScrapeJobRequest,
} from "@jobpilot/shared-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "../db/client.js";
import {
  applicationEvents,
  applications,
  automationRuns,
  profiles,
  resumes,
  scrapedJobs,
  users,
} from "../db/schema.js";
import {
  buildDemoReviewUrl,
  demoApplicantFields,
  demoMissingFields,
  type DemoApplicant,
} from "../lib/demoAutofill.js";
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
  importWishlistFromUrl(
    userId: string,
    url: string,
  ): Promise<{
    runId: string;
    applicationId: string;
    company: string;
    roleTitle: string;
    jobUrl: string;
  }>;
  prepareDemo(
    userId: string,
    input: AutofillJobRequest,
  ): Promise<{
    runId: string;
    applicationId: string;
    reviewUrl: string;
    filledFields: Record<string, string>;
    missingFields: string[];
    submitted: boolean;
  }>;
  enqueueAutofill(userId: string, input: AutofillJobRequest): Promise<QueueJobResponse>;
  confirmSubmit(userId: string, runId: string): Promise<AutomationRun>;
  cancelRun(userId: string, runId: string): Promise<AutomationRun>;
  deleteRun(userId: string, runId: string): Promise<boolean>;
  clearFinishedRuns(userId: string): Promise<number>;
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
      const url = input.url?.trim();
      const [run] = await db
        .insert(automationRuns)
        .values({
          userId,
          type: "scrape",
          status: "queued",
          logs: [
            {
              step: "queued",
              message: url
                ? "Opening job page to read title and company for Wishlist…"
                : "Job search queued",
              timestamp: nowIso(),
            },
          ],
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
        url: url ?? null,
      });

      return { runId: run.id };
    },

    async importWishlistFromUrl(userId, rawUrl) {
      const url = rawUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new Error("Job URL must start with http:// or https://");
      }

      const startedAt = new Date();
      const [run] = await db
        .insert(automationRuns)
        .values({
          userId,
          type: "scrape",
          status: "running",
          startedAt,
          logs: [
            {
              step: "running",
              message: "Reading job page now (fast path — not waiting in queue)…",
              timestamp: startedAt.toISOString(),
            },
          ],
        })
        .returning();

      if (!run) {
        throw new Error("Failed to create wishlist import run");
      }

      try {
        const response = await fetch(`${workerBaseUrl.replace(/\/$/, "")}/scrape`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: null, url }),
          signal: AbortSignal.timeout(45_000),
        });
        if (!response.ok) {
          throw new Error(`Could not read job page (${response.status})`);
        }
        const body = (await response.json()) as {
          jobs: Array<{ title: string; company: string; url: string; description?: string | null }>;
          logs: WorkerLog[];
        };
        const scraped = body.jobs[0];
        if (!scraped) {
          throw new Error("No job details found on that page");
        }

        const jobUrl = absoluteWorkerUrl(workerBaseUrl, scraped.url || url);
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
            userId,
            company: scraped.company,
            roleTitle: scraped.title,
            jobUrl,
            status: "wishlist",
            source: "automation",
            notes: scraped.description ?? null,
          })
          .returning();

        if (!app) {
          throw new Error("Failed to save Wishlist application");
        }

        const logs = [
          ...normalizeLogs(body.logs),
          {
            step: "board_import",
            message: `Added to Wishlist: ${app.company} — ${app.roleTitle}`,
            timestamp: nowIso(),
          },
        ];

        await db
          .update(automationRuns)
          .set({
            status: "success",
            finishedAt: new Date(),
            applicationId: app.id,
            logs,
          })
          .where(eq(automationRuns.id, run.id));

        return {
          runId: run.id,
          applicationId: app.id,
          company: app.company,
          roleTitle: app.roleTitle,
          jobUrl: app.jobUrl ?? jobUrl,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wishlist import failed";
        await db
          .update(automationRuns)
          .set({
            status: "failed",
            finishedAt: new Date(),
            logs: [{ step: "failed", message, timestamp: nowIso() }],
          })
          .where(eq(automationRuns.id, run.id));
        throw error;
      }
    },

    async prepareDemo(userId, input) {
      const [app] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), eq(applications.userId, userId)))
        .limit(1);
      if (!app) {
        throw new ApplicationNotFoundError();
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      let resume =
        input.resumeId != null
          ? (
              await db
                .select()
                .from(resumes)
                .where(and(eq(resumes.id, input.resumeId), eq(resumes.userId, userId)))
                .limit(1)
            )[0]
          : undefined;
      if (!resume) {
        const [primary] = await db
          .select()
          .from(resumes)
          .where(and(eq(resumes.userId, userId), eq(resumes.isPrimary, true)))
          .limit(1);
        resume = primary;
      }
      if (!resume) {
        const [any] = await db.select().from(resumes).where(eq(resumes.userId, userId)).limit(1);
        resume = any;
      }

      const portfolio = profile?.portfolioUrl ?? null;
      const github = portfolio && /github\.com/i.test(portfolio) ? portfolio : null;
      const autoSubmit = input.autoSubmit !== false;

      const applicant: DemoApplicant = {
        name: user?.name?.trim() || "",
        email: user?.email?.trim() || "",
        phone: profile?.phone ?? null,
        location: profile?.location ?? null,
        linkedinUrl: profile?.linkedinUrl ?? null,
        portfolioUrl: portfolio,
        githubUrl: github,
        websiteUrl: portfolio && !github ? portfolio : null,
        workAuthStatus: profile?.workAuthStatus ?? null,
        coverLetter: `Hello ${app.company} hiring team,\n\nI'm excited to apply for the ${app.roleTitle} role. My background aligns with what you're looking for, and I'd welcome the chance to contribute.\n\nThank you for considering my application.\n\nPrepared with JobPilot.`,
        currentTitle: `Applicant for ${app.roleTitle}`,
        yearsExperience: "1-3",
        relocation: "hybrid",
        additionalInfo: resume
          ? `Resume selected in JobPilot: ${resume.label}`
          : "No resume selected — add one in Match Scorer.",
        resumeFileName: resume
          ? `${resume.label.replace(/[^\w.\- ]+/g, "").trim() || "resume"}.pdf`
          : null,
      };

      const demoBase = `${workerBaseUrl.replace(/\/$/, "")}/fixtures/demo-apply.html`;
      const formUrl =
        input.formUrl.includes("demo-apply") || input.formUrl.includes("demo_apply")
          ? input.formUrl.split("?")[0] || demoBase
          : demoBase;

      const filledFields = demoApplicantFields(applicant);
      const missingFields = demoMissingFields(applicant);
      const reviewUrl = buildDemoReviewUrl({
        formUrl,
        applicant,
        company: app.company,
        roleTitle: app.roleTitle,
        autoSubmit,
      });

      const startedAt = new Date();
      const logs: AutomationLogEntry[] = [
        {
          step: "fast_path",
          message: "Demo ATS prepared instantly (no browser wait).",
          timestamp: startedAt.toISOString(),
        },
        {
          step: "form_url",
          message: `Form URL: ${formUrl}`,
          timestamp: nowIso(),
        },
        {
          step: "review_url",
          message: `Review URL: ${reviewUrl}`,
          timestamp: nowIso(),
        },
        {
          step: "resume",
          message: resume
            ? `Attached resume: ${resume.label}`
            : "No resume on file — form still opens, but upload is empty.",
          timestamp: nowIso(),
        },
        {
          step: "filled_fields",
          message: JSON.stringify(filledFields),
          timestamp: nowIso(),
        },
      ];
      if (missingFields.length > 0) {
        logs.push({
          step: "profile_gaps",
          message: `Complete in Settings / Match Scorer: ${missingFields.join(", ")}`,
          timestamp: nowIso(),
        });
      }

      if (autoSubmit) {
        const previousStatus = app.status;
        await db
          .update(applications)
          .set({
            status: "applied",
            appliedAt: new Date(),
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
              via: "demo_auto_submit",
              company: app.company,
              roleTitle: app.roleTitle,
              resumeId: resume?.id ?? null,
              resumeLabel: resume?.label ?? null,
            },
          });
        }
        logs.push(
          {
            step: "demo_submit",
            message:
              "Demo form auto-submit armed — open the review link to watch fields fill and the application submit.",
            timestamp: nowIso(),
          },
          {
            step: "marked_applied",
            message: `Moved ${app.company} — ${app.roleTitle} to Applied on your board.`,
            timestamp: nowIso(),
          },
        );
      } else {
        logs.push({
          step: "awaiting_confirm",
          message:
            "Open the review link, submit yourself on the demo form, then mark Applied here.",
          timestamp: nowIso(),
        });
      }

      const [run] = await db
        .insert(automationRuns)
        .values({
          userId,
          applicationId: app.id,
          type: "autofill",
          status: "success",
          startedAt,
          finishedAt: new Date(),
          logs,
        })
        .returning();

      if (!run) {
        throw new Error("Failed to create demo prepare run");
      }

      return {
        runId: run.id,
        applicationId: app.id,
        reviewUrl,
        filledFields,
        missingFields,
        submitted: autoSubmit,
      };
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

    async deleteRun(userId, runId) {
      const run = await this.getRun(userId, runId);
      if (!run) {
        return false;
      }
      if (run.status === "queued" || run.status === "running") {
        throw new AutomationCancelError("Stop the job first, then you can remove it");
      }
      const deleted = await db
        .delete(automationRuns)
        .where(and(eq(automationRuns.id, runId), eq(automationRuns.userId, userId)))
        .returning({ id: automationRuns.id });
      return deleted.length > 0;
    },

    async clearFinishedRuns(userId) {
      const deleted = await db
        .delete(automationRuns)
        .where(
          and(
            eq(automationRuns.userId, userId),
            inArray(automationRuns.status, ["success", "failed", "canceled"]),
          ),
        )
        .returning({ id: automationRuns.id });
      return deleted.length;
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
      let firstApplicationId: string | null = null;
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
          firstApplicationId ??= app.id;
        }
      }

      const logs = normalizeLogs(body.logs);
      await db
        .update(automationRuns)
        .set({
          status: "success",
          finishedAt: new Date(),
          ...(firstApplicationId ? { applicationId: firstApplicationId } : {}),
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
    const [primaryResume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, job.userId), eq(resumes.isPrimary, true)))
      .limit(1);
    const [anyResume] =
      primaryResume != null
        ? [primaryResume]
        : await db.select().from(resumes).where(eq(resumes.userId, job.userId)).limit(1);

    const demoForm = `${workerBaseUrl.replace(/\/$/, "")}/fixtures/demo-apply.html`;
    const requested = job.formUrl?.trim() || "";
    const useDemo =
      requested === "" ||
      requested.includes("demo-apply") ||
      requested.includes("demo_apply") ||
      requested.includes("/fixtures/");
    const formUrl = absoluteWorkerUrl(
      workerBaseUrl,
      useDemo ? demoForm : requested || app?.jobUrl || demoForm,
    );

    const coverLetter =
      app != null
        ? `Hello ${app.company} hiring team,\n\nI'm excited to apply for the ${app.roleTitle} role. My background aligns with what you're looking for, and I'd welcome the chance to contribute.\n\nThank you for considering my application.\n\nPrepared with JobPilot — I will review this form before submitting.`
        : "Excited to apply. Prepared with JobPilot — I will review this form before submitting.";

    const resume = anyResume;
    const portfolio = profile?.portfolioUrl ?? null;
    const github = portfolio && /github\.com/i.test(portfolio) ? portfolio : null;

    const response = await fetch(`${workerBaseUrl.replace(/\/$/, "")}/autofill`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formUrl,
        company: app?.company ?? null,
        roleTitle: app?.roleTitle ?? null,
        applicant: {
          name: user?.name?.trim() || "",
          email: user?.email?.trim() || "",
          phone: profile?.phone ?? null,
          location: profile?.location ?? null,
          linkedinUrl: profile?.linkedinUrl ?? null,
          portfolioUrl: portfolio,
          githubUrl: github,
          websiteUrl: portfolio && !github ? portfolio : null,
          workAuthStatus: profile?.workAuthStatus ?? null,
          coverLetter,
          currentTitle: app?.roleTitle ? `Applicant for ${app.roleTitle}` : null,
          yearsExperience: "1-3",
          relocation: "hybrid",
          additionalInfo: resume
            ? `Resume on file in JobPilot: ${resume.label}`
            : "Please complete profile/resume in JobPilot for a fuller application.",
          resumeFileName: resume
            ? `${resume.label.replace(/[^\w.\- ]+/g, "").trim() || "resume"}.txt`
            : null,
          resumeText: resume?.parsedText?.slice(0, 4000) ?? null,
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
      missingFields?: string[];
    };

    const reviewUrl = body.reviewUrl ?? formUrl;
    const missing = body.missingFields ?? [];
    const logs = [
      { step: "form_url", message: `Form URL: ${formUrl}`, timestamp: nowIso() },
      { step: "review_url", message: `Review URL: ${reviewUrl}`, timestamp: nowIso() },
      ...(missing.length > 0
        ? [
            {
              step: "profile_gaps",
              message: `Complete these in Settings / Match Scorer for a fuller fill: ${missing.join(", ")}`,
              timestamp: nowIso(),
            },
          ]
        : []),
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
          "Form prepared. Open the review link to see the filled demo ATS, submit yourself if it looks right, then mark Applied here.",
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
    return;
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
