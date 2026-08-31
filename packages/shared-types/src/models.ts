import type {
  ApplicationEventType,
  ApplicationSource,
  ApplicationStatus,
  AutomationRunStatus,
  AutomationRunType,
  Plan,
  ScrapeSource,
  SubscriptionStatus,
} from "./enums.js";

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  createdAt: string;
}

export interface Profile {
  userId: string;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  workAuthStatus: string | null;
}

export interface Resume {
  id: string;
  userId: string;
  label: string;
  storagePath: string;
  parsedText: string | null;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface Application {
  id: string;
  userId: string;
  company: string;
  roleTitle: string;
  jobUrl: string | null;
  status: ApplicationStatus;
  appliedAt: string | null;
  source: ApplicationSource;
  matchScore: number | null;
  notes: string | null;
  salaryRange: string | null;
  createdAt: string;
}

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  eventType: ApplicationEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AutomationLogEntry {
  step: string;
  message: string;
  screenshotUrl?: string;
  timestamp: string;
}

export interface AutomationRun {
  id: string;
  userId: string;
  applicationId: string | null;
  type: AutomationRunType;
  status: AutomationRunStatus;
  logs: AutomationLogEntry[];
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ScrapedJob {
  id: string;
  source: ScrapeSource;
  title: string;
  company: string;
  description: string | null;
  url: string;
  raw: Record<string, unknown>;
  scrapedAt: string;
}

export interface Subscription {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}
