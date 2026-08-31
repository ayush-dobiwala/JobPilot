import type {
  AnalyticsSummary,
  AutomationRun,
  AutofillJobRequest,
  CheckoutSessionResponse,
  FunnelCounts,
  PortalSessionResponse,
  Profile,
  QueueJobResponse,
  ScrapeJobRequest,
  Subscription,
  UpdateProfileRequest,
  WishlistFromUrlResponse,
} from "@jobpilot/shared-types";
import { apiFetch } from "@/lib/api";

export async function fetchAutomationRuns(token: string): Promise<AutomationRun[]> {
  const response = await apiFetch("/api/automation/runs", token);
  if (!response.ok) {
    throw new Error("Failed to load automation runs");
  }
  const body = (await response.json()) as { data: AutomationRun[] };
  return body.data;
}

export async function enqueueScrape(
  token: string,
  body: ScrapeJobRequest,
): Promise<QueueJobResponse> {
  const response = await apiFetch("/api/automation/scrape", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = "Failed to save job from link";
    try {
      const errBody = (await response.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await response.json()) as QueueJobResponse;
}

export async function importWishlistFromUrl(
  token: string,
  url: string,
): Promise<WishlistFromUrlResponse> {
  const response = await apiFetch("/api/automation/wishlist", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    let message = "Failed to save job from link";
    try {
      const errBody = (await response.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await response.json()) as WishlistFromUrlResponse;
}

export async function deleteAutomationRun(token: string, runId: string): Promise<void> {
  const response = await apiFetch(`/api/automation/runs/${runId}`, token, {
    method: "DELETE",
  });
  if (!response.ok) {
    let message = "Failed to remove activity";
    try {
      const errBody = (await response.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}

export async function clearFinishedAutomationRuns(token: string): Promise<number> {
  const response = await apiFetch("/api/automation/runs", token, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to clear finished activity");
  }
  const body = (await response.json()) as { removed: number };
  return body.removed;
}

export async function enqueueAutofill(
  token: string,
  body: AutofillJobRequest,
): Promise<QueueJobResponse> {
  const response = await apiFetch("/api/automation/autofill", token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to queue autofill");
  }
  return (await response.json()) as QueueJobResponse;
}

export async function confirmSubmit(token: string, runId: string): Promise<AutomationRun> {
  const response = await apiFetch(`/api/automation/runs/${runId}/confirm-submit`, token, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to confirm submit");
  }
  return (await response.json()) as AutomationRun;
}

export async function cancelAutomationRun(token: string, runId: string): Promise<AutomationRun> {
  const response = await apiFetch(`/api/automation/runs/${runId}/cancel`, token, {
    method: "POST",
  });
  if (!response.ok) {
    let message = "Failed to stop job";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await response.json()) as AutomationRun;
}

export async function fetchAnalyticsSummary(token: string): Promise<AnalyticsSummary> {
  const response = await apiFetch("/api/analytics/summary", token);
  if (!response.ok) {
    throw new Error("Failed to load analytics summary");
  }
  return (await response.json()) as AnalyticsSummary;
}

export async function fetchAnalyticsFunnel(token: string): Promise<FunnelCounts> {
  const response = await apiFetch("/api/analytics/funnel", token);
  if (!response.ok) {
    throw new Error("Failed to load funnel");
  }
  return (await response.json()) as FunnelCounts;
}

export async function fetchSubscription(token: string): Promise<Subscription | null> {
  const response = await apiFetch("/api/billing/subscription", token);
  if (!response.ok) {
    throw new Error("Failed to load subscription");
  }
  return (await response.json()) as Subscription | null;
}

export async function createCheckoutSession(token: string): Promise<CheckoutSessionResponse> {
  const response = await apiFetch("/api/billing/checkout-session", token, { method: "POST" });
  if (!response.ok) {
    throw new Error("Stripe checkout is not configured yet");
  }
  return (await response.json()) as CheckoutSessionResponse;
}

export async function createPortalSession(token: string): Promise<PortalSessionResponse> {
  const response = await apiFetch("/api/billing/portal-session", token, { method: "POST" });
  if (!response.ok) {
    throw new Error("Stripe portal is not configured yet");
  }
  return (await response.json()) as PortalSessionResponse;
}

export async function fetchProfile(token: string): Promise<Profile | null> {
  const response = await apiFetch("/api/profile", token);
  if (!response.ok) {
    throw new Error("Failed to load profile");
  }
  return (await response.json()) as Profile | null;
}

export async function updateProfile(token: string, body: UpdateProfileRequest): Promise<Profile> {
  const response = await apiFetch("/api/profile", token, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to save profile");
  }
  return (await response.json()) as Profile;
}
