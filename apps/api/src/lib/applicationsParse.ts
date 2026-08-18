import {
  isApplicationStatus,
  type CreateApplicationRequest,
  type ListApplicationsQuery,
  type UpdateApplicationRequest,
} from "@jobpilot/shared-types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function asRecord(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  return body as Record<string, unknown>;
}

function optionalString(value: unknown, field: string): ParseResult<string | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string` };
  }
  return { ok: true, value };
}

function optionalNullableString(
  value: unknown,
  field: string,
): ParseResult<string | null | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string or null` };
  }
  return { ok: true, value };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function parseListQuery(
  query: Record<string, string | undefined>,
): ParseResult<ListApplicationsQuery> {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const pageSize = Math.min(parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  const result: ListApplicationsQuery = { page, pageSize };

  if (query.status !== undefined && query.status !== "") {
    if (!isApplicationStatus(query.status)) {
      return { ok: false, error: "status must be a valid application status" };
    }
    result.status = query.status;
  }

  if (query.search !== undefined) {
    const search = query.search.trim();
    if (search !== "") {
      result.search = search;
    }
  }

  return { ok: true, value: result };
}

export function parseCreateBody(body: unknown): ParseResult<CreateApplicationRequest> {
  const record = asRecord(body);
  if (!record) {
    return { ok: false, error: "Invalid JSON body" };
  }

  if (typeof record.company !== "string" || record.company.trim() === "") {
    return { ok: false, error: "company is required" };
  }
  if (typeof record.roleTitle !== "string" || record.roleTitle.trim() === "") {
    return { ok: false, error: "roleTitle is required" };
  }

  const result: CreateApplicationRequest = {
    company: record.company.trim(),
    roleTitle: record.roleTitle.trim(),
  };

  const jobUrl = optionalString(record.jobUrl, "jobUrl");
  if (!jobUrl.ok) return jobUrl;
  if (jobUrl.value !== undefined) result.jobUrl = jobUrl.value;

  if (record.status !== undefined) {
    if (!isApplicationStatus(record.status)) {
      return { ok: false, error: "status must be a valid application status" };
    }
    result.status = record.status;
  }

  const notes = optionalString(record.notes, "notes");
  if (!notes.ok) return notes;
  if (notes.value !== undefined) result.notes = notes.value;

  const salaryRange = optionalString(record.salaryRange, "salaryRange");
  if (!salaryRange.ok) return salaryRange;
  if (salaryRange.value !== undefined) result.salaryRange = salaryRange.value;

  return { ok: true, value: result };
}

export function parseUpdateBody(body: unknown): ParseResult<UpdateApplicationRequest> {
  const record = asRecord(body);
  if (!record) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const result: UpdateApplicationRequest = {};

  const company = optionalString(record.company, "company");
  if (!company.ok) return company;
  if (company.value !== undefined) {
    if (company.value.trim() === "") {
      return { ok: false, error: "company cannot be empty" };
    }
    result.company = company.value.trim();
  }

  const roleTitle = optionalString(record.roleTitle, "roleTitle");
  if (!roleTitle.ok) return roleTitle;
  if (roleTitle.value !== undefined) {
    if (roleTitle.value.trim() === "") {
      return { ok: false, error: "roleTitle cannot be empty" };
    }
    result.roleTitle = roleTitle.value.trim();
  }

  const jobUrl = optionalNullableString(record.jobUrl, "jobUrl");
  if (!jobUrl.ok) return jobUrl;
  if (jobUrl.value !== undefined) result.jobUrl = jobUrl.value;

  if (record.status !== undefined) {
    if (!isApplicationStatus(record.status)) {
      return { ok: false, error: "status must be a valid application status" };
    }
    result.status = record.status;
  }

  const notes = optionalNullableString(record.notes, "notes");
  if (!notes.ok) return notes;
  if (notes.value !== undefined) result.notes = notes.value;

  const salaryRange = optionalNullableString(record.salaryRange, "salaryRange");
  if (!salaryRange.ok) return salaryRange;
  if (salaryRange.value !== undefined) result.salaryRange = salaryRange.value;

  if (record.appliedAt !== undefined) {
    if (record.appliedAt === null) {
      result.appliedAt = null;
    } else if (typeof record.appliedAt === "string") {
      const date = new Date(record.appliedAt);
      if (Number.isNaN(date.getTime())) {
        return { ok: false, error: "appliedAt must be a valid ISO date" };
      }
      result.appliedAt = date.toISOString();
    } else {
      return { ok: false, error: "appliedAt must be a string or null" };
    }
  }

  if (record.matchScore !== undefined) {
    if (record.matchScore === null) {
      result.matchScore = null;
    } else if (
      typeof record.matchScore === "number" &&
      Number.isInteger(record.matchScore) &&
      record.matchScore >= 0 &&
      record.matchScore <= 100
    ) {
      result.matchScore = record.matchScore;
    } else {
      return { ok: false, error: "matchScore must be an integer between 0 and 100" };
    }
  }

  if (Object.keys(result).length === 0) {
    return { ok: false, error: "At least one field is required" };
  }

  return { ok: true, value: result };
}
