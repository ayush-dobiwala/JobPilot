import { Queue, Worker, type Job } from "bullmq";
import type { Database } from "../db/client.js";
import { processAutomationJob } from "../services/automation.js";
import type { AutomationJobName, AutomationJobPayload, JobQueue } from "./types.js";

export { createMemoryQueue } from "./memory.js";

const QUEUE_NAME = "jobpilot-automation";

function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    maxRetriesPerRequest: null as null,
  };
}

export function createBullMqQueue(
  redisUrl: string,
  db: Database,
  workerBaseUrl: string,
): { queue: JobQueue; worker: Worker<AutomationJobPayload> } {
  const connection = redisConnection(redisUrl);
  const bullQueue = new Queue<AutomationJobPayload>(QUEUE_NAME, { connection });

  const worker = new Worker<AutomationJobPayload>(
    QUEUE_NAME,
    async (job: Job<AutomationJobPayload>) => {
      await processAutomationJob(db, workerBaseUrl, job.data);
    },
    { connection },
  );

  worker.on("failed", (job, error) => {
    console.error(`Automation job failed (${job?.id ?? "unknown"}):`, error.message);
  });

  const queue: JobQueue = {
    async add(name: AutomationJobName, payload) {
      await bullQueue.add(name, payload, {
        removeOnComplete: 100,
        removeOnFail: 200,
      });
    },
    async close() {
      await worker.close();
      await bullQueue.close();
    },
  };

  return { queue, worker };
}
