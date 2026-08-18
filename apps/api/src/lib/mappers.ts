import type { Application, ApplicationEvent } from "@jobpilot/shared-types";
import type { ApplicationEventRow, ApplicationRow } from "../db/schema.js";

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
