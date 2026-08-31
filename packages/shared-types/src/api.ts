import type { ApplicationStatus, Plan } from "./enums.js";
import type { Application, ApplicationEvent, AutomationRun } from "./models.js";

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ListApplicationsQuery {
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CreateApplicationRequest {
  company: string;
  roleTitle: string;
  jobUrl?: string;
  status?: ApplicationStatus;
  notes?: string;
  salaryRange?: string;
}

export interface UpdateApplicationRequest {
  company?: string;
  roleTitle?: string;
  jobUrl?: string | null;
  status?: ApplicationStatus;
  notes?: string | null;
  salaryRange?: string | null;
  appliedAt?: string | null;
  matchScore?: number | null;
}

export type ListApplicationsResponse = PaginatedResponse<Application>;

export interface MatchScoreRequest {
  resumeId: string;
  jobDescription: string;
}

export interface MatchScoreResponse {
  score: number;
  missingKeywords: string[];
  suggestions: string[];
}

export interface ScrapeJobRequest {
  url?: string;
  query?: string;
}

export interface AutofillJobRequest {
  applicationId: string;
  formUrl: string;
}

export interface QueueJobResponse {
  runId: string;
}

export interface AnalyticsSummary {
  applicationsThisWeek: number;
  responseRate: number;
  upcomingInterviews: number;
  averageDaysToResponse: number | null;
}

export interface FunnelCounts {
  wishlist: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface UpdateProfileRequest {
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  workAuthStatus?: string | null;
}

export interface ListAutomationRunsResponse {
  data: AutomationRun[];
}

export interface CreateResumeRequest {
  parsedText: string;
  label?: string;
  isPrimary?: boolean;
}

export interface UpdateResumeRequest {
  label?: string;
  isPrimary?: boolean;
}

export interface MatchScoreUsageResponse {
  used: number;
  limit: number | null;
  plan: Plan;
}

export type { Application, ApplicationEvent, AutomationRun };
