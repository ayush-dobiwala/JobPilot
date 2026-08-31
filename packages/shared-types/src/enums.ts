export const PLANS = ["free", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_SOURCES = ["manual", "automation"] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const AUTOMATION_RUN_TYPES = ["scrape", "autofill"] as const;
export type AutomationRunType = (typeof AUTOMATION_RUN_TYPES)[number];

export const AUTOMATION_RUN_STATUSES = ["queued", "running", "success", "failed"] as const;
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number];

export const APPLICATION_EVENT_TYPES = ["status_change", "note", "interview_scheduled"] as const;
export type ApplicationEventType = (typeof APPLICATION_EVENT_TYPES)[number];

export const SCRAPE_SOURCES = ["linkedin", "indeed", "generic"] as const;
export type ScrapeSource = (typeof SCRAPE_SOURCES)[number];

export const SUBSCRIPTION_STATUSES = [
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Free tier: 5 AI match scores per calendar month. Pro: unlimited. */
export const FREE_TIER_MATCH_SCORES_PER_MONTH = 5;

/** Suggested Pro list price in USD. Stripe price ID comes from env. */
export const PRO_MONTHLY_PRICE_USD = 15;
