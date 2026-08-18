import {
  APPLICATION_EVENT_TYPES,
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  AUTOMATION_RUN_STATUSES,
  AUTOMATION_RUN_TYPES,
  PLANS,
  SCRAPE_SOURCES,
  SUBSCRIPTION_STATUSES,
  type ApplicationEventType,
  type ApplicationSource,
  type ApplicationStatus,
  type AutomationRunStatus,
  type AutomationRunType,
  type Plan,
  type ScrapeSource,
  type SubscriptionStatus,
} from "./enums.js";

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function isPlan(value: unknown): value is Plan {
  return isOneOf(value, PLANS);
}

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return isOneOf(value, APPLICATION_STATUSES);
}

export function isApplicationSource(value: unknown): value is ApplicationSource {
  return isOneOf(value, APPLICATION_SOURCES);
}

export function isAutomationRunType(value: unknown): value is AutomationRunType {
  return isOneOf(value, AUTOMATION_RUN_TYPES);
}

export function isAutomationRunStatus(value: unknown): value is AutomationRunStatus {
  return isOneOf(value, AUTOMATION_RUN_STATUSES);
}

export function isApplicationEventType(value: unknown): value is ApplicationEventType {
  return isOneOf(value, APPLICATION_EVENT_TYPES);
}

export function isScrapeSource(value: unknown): value is ScrapeSource {
  return isOneOf(value, SCRAPE_SOURCES);
}

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return isOneOf(value, SUBSCRIPTION_STATUSES);
}
