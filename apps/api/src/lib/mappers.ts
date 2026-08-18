import type { Application, ApplicationEvent, User } from "@jobpilot/shared-types";
import type { ApplicationEventRow, ApplicationRow, UserRow } from "../db/schema.js";

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    createdAt: row.createdAt.toISOString(),
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
