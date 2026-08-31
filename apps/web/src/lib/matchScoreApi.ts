import type {
  CreateResumeRequest,
  MatchScoreRequest,
  MatchScoreResponse,
  MatchScoreUsageResponse,
  Resume,
  UpdateResumeRequest,
} from "@jobpilot/shared-types";
import { apiFetch } from "./api.js";
import { ApiError } from "./applicationsApi.js";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function fetchMatchScoreUsage(token: string | null): Promise<MatchScoreUsageResponse> {
  const response = await apiFetch("/api/match-score/usage", token);
  return parseJson<MatchScoreUsageResponse>(response);
}

export async function runMatchScore(
  token: string | null,
  body: MatchScoreRequest,
): Promise<MatchScoreResponse> {
  const response = await apiFetch("/api/match-score", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseJson<MatchScoreResponse>(response);
}

export async function listResumes(token: string | null): Promise<Resume[]> {
  const response = await apiFetch("/api/resumes", token);
  const body = await parseJson<{ data: Resume[] }>(response);
  return body.data;
}

export async function createResume(
  token: string | null,
  body: CreateResumeRequest,
): Promise<Resume> {
  const response = await apiFetch("/api/resumes", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseJson<Resume>(response);
}

export async function uploadResumeFile(
  token: string | null,
  file: File,
  options: { label?: string; isPrimary?: boolean } = {},
): Promise<Resume> {
  const form = new FormData();
  form.append("file", file);
  if (options.label?.trim()) {
    form.append("label", options.label.trim());
  }
  form.append("isPrimary", options.isPrimary ? "true" : "false");
  const response = await apiFetch("/api/resumes/upload", token, {
    method: "POST",
    body: form,
  });
  return parseJson<Resume>(response);
}

export async function updateResume(
  token: string | null,
  id: string,
  body: UpdateResumeRequest,
): Promise<Resume> {
  const response = await apiFetch(`/api/resumes/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return parseJson<Resume>(response);
}

export async function deleteResume(token: string | null, id: string): Promise<void> {
  const response = await apiFetch(`/api/resumes/${id}`, token, {
    method: "DELETE",
  });
  await parseJson<void>(response);
}
