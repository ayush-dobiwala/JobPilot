import type { AutomationJobPayload, JobQueue } from "./types.js";

export function createMemoryQueue(
  processJob: (payload: AutomationJobPayload) => Promise<void>,
): JobQueue {
  return {
    async add(_name, payload) {
      // Process asynchronously so HTTP handlers can return runId immediately.
      void processJob(payload);
    },
    async close() {
      return;
    },
  };
}
