const DEFAULT_TIMEOUT_MS = 12_000;

export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return "";
  }
  return import.meta.env.VITE_API_URL ?? "";
}

export class ApiTimeoutError extends Error {
  constructor(message = "API timed out. The server may be waking up — try again.") {
    super(message);
    this.name = "ApiTimeoutError";
  }
}

export async function apiFetch(
  path: string,
  token: string | null,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiTimeoutError();
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
    if (init.signal) {
      init.signal.removeEventListener("abort", onAbort);
    }
  }
}

/** Wake a sleeping free-tier API (Render) before the user hits authenticated routes. */
export function warmApi(): void {
  const url = `${getApiBaseUrl()}/health`;
  void fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  }).catch(() => undefined);
}

export function shouldKeepPolling(status: number, attempts: number, maxAttempts: number): boolean {
  return status === 404 && attempts < maxAttempts;
}
