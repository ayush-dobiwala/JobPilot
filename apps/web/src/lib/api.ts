export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return "";
  }
  return import.meta.env.VITE_API_URL ?? "";
}

export async function apiFetch(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });
}

export function shouldKeepPolling(status: number, attempts: number, maxAttempts: number): boolean {
  return status === 404 && attempts < maxAttempts;
}
