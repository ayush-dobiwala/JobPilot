import type {
  Application,
  ApplicationEvent,
  AutomationRun,
  Profile,
  Resume,
  User,
} from "@jobpilot/shared-types";
import type {
  ApplicationEventRow,
  ApplicationRow,
  AutomationRunRow,
  ProfileRow,
  ResumeRow,
  UserRow,
} from "../db/schema.js";

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.userId,
    phone: row.phone,
    location: row.location,
    linkedinUrl: row.linkedinUrl,
    portfolioUrl: row.portfolioUrl,
    workAuthStatus: row.workAuthStatus,
  };
}

export function toResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    userId: row.userId,
    storagePath: row.storagePath,
    parsedText: row.parsedText,
    isPrimary: row.isPrimary,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    userId: row.userId,
    company: row.company,
    roleTitle: row.roleTitle,
    jobUrl: row.jobUrl,
    status: row.status,
    appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
    source: row.source,
    matchScore: row.matchScore,
    notes: row.notes,
    salaryRange: row.salaryRange,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toApplicationEvent(row: ApplicationEventRow): ApplicationEvent {
  return {
    id: row.id,
    applicationId: row.applicationId,
    eventType: row.eventType,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAutomationRun(row: AutomationRunRow): AutomationRun {
  return {
    id: row.id,
    userId: row.userId,
    applicationId: row.applicationId,
    type: row.type,
    status: row.status,
    logs: row.logs,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
  };
}
