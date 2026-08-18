import { describe, expect, it } from "vitest";
import { isApplicationStatus, isAutomationRunStatus, isPlan, isScrapeSource } from "./guards.js";

describe("isPlan", () => {
  it("accepts free and pro", () => {
    expect(isPlan("free")).toBe(true);
    expect(isPlan("pro")).toBe(true);
  });

  it("rejects unknown plans", () => {
    expect(isPlan("enterprise")).toBe(false);
    expect(isPlan(null)).toBe(false);
  });
});

describe("isApplicationStatus", () => {
  it("accepts every Kanban column", () => {
    expect(isApplicationStatus("wishlist")).toBe(true);
    expect(isApplicationStatus("applied")).toBe(true);
    expect(isApplicationStatus("interview")).toBe(true);
    expect(isApplicationStatus("offer")).toBe(true);
    expect(isApplicationStatus("rejected")).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(isApplicationStatus("pending")).toBe(false);
    expect(isApplicationStatus("")).toBe(false);
  });
});

describe("isAutomationRunStatus", () => {
  it("accepts queue lifecycle values", () => {
    expect(isAutomationRunStatus("queued")).toBe(true);
    expect(isAutomationRunStatus("running")).toBe(true);
    expect(isAutomationRunStatus("success")).toBe(true);
    expect(isAutomationRunStatus("failed")).toBe(true);
  });
});

describe("isScrapeSource", () => {
  it("accepts known boards", () => {
    expect(isScrapeSource("generic")).toBe(true);
    expect(isScrapeSource("linkedin")).toBe(true);
  });

  it("rejects unknown boards", () => {
    expect(isScrapeSource("monster")).toBe(false);
  });
});
