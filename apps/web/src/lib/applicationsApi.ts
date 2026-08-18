import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  CreateApplicationRequest,
  ListApplicationsResponse,
  UpdateApplicationRequest,
} from "@jobpilot/shared-types";
import { apiFetch } from "./api.js";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export async function listApplications(
  token: string | null,
  query: { search?: string; pageSize?: number } = {},
): Promise<ListApplicationsResponse> {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("pageSize", String(query.pageSize ?? 100));
  if (query.search) {
    params.set("search", query.search);
  }
  const response = await apiFetch(`/api/applications?${params.toString()}`, token);
  return parseJson<ListApplicationsResponse>(response);
}

export async function createApplication(
  token: string | null,
  body: CreateApplicationRequest,
): Promise<Application> {
  const response = await apiFetch("/api/applications", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseJson<Application>(response);
}

export async function updateApplication(
  token: string | null,
  id: string,
  body: UpdateApplicationRequest,
): Promise<Application> {
  const response = await apiFetch(`/api/applications/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return parseJson<Application>(response);
}

export async function deleteApplication(token: string | null, id: string): Promise<void> {
  const response = await apiFetch(`/api/applications/${id}`, token, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    await parseJson(response);
  }
}

export async function listApplicationEvents(
  token: string | null,
  id: string,
): Promise<ApplicationEvent[]> {
  const response = await apiFetch(`/api/applications/${id}/events`, token);
  const body = await parseJson<{ data: ApplicationEvent[] }>(response);
  return body.data;
}

export function groupApplicationsByStatus(
  applications: Application[],
): Record<ApplicationStatus, Application[]> {
  return {
    wishlist: applications.filter((a) => a.status === "wishlist"),
    applied: applications.filter((a) => a.status === "applied"),
    interview: applications.filter((a) => a.status === "interview"),
    offer: applications.filter((a) => a.status === "offer"),
    rejected: applications.filter((a) => a.status === "rejected"),
  };
}

export const KANBAN_COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: "wishlist", label: "Wishlist" },
  { status: "applied", label: "Applied" },
  { status: "interview", label: "Interview" },
  { status: "offer", label: "Offer" },
  { status: "rejected", label: "Rejected" },
];
