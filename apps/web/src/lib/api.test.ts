import { describe, expect, it } from "vitest";
import { getApiBaseUrl, shouldKeepPolling } from "@/lib/api";

describe("shouldKeepPolling", () => {
  it("keeps polling 404s until the attempt cap", () => {
    expect(shouldKeepPolling(404, 1, 12)).toBe(true);
    expect(shouldKeepPolling(404, 12, 12)).toBe(false);
    expect(shouldKeepPolling(401, 1, 12)).toBe(false);
  });
});

describe("getApiBaseUrl", () => {
  it("uses the Vite proxy in development", () => {
    expect(getApiBaseUrl()).toBe("");
  });
});
