export type AutomationJobName = "scrape" | "autofill";

export interface AutomationJobPayload {
  runId: string;
  userId: string;
  type: AutomationJobName;
  query?: string | null;
  url?: string | null;
  applicationId?: string | null;
  formUrl?: string | null;
}

export interface JobQueue {
  add(name: AutomationJobName, payload: AutomationJobPayload): Promise<void>;
  close(): Promise<void>;
}
