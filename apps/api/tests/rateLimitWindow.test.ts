import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "../src/lib/rateLimitWindow.js";

describe("consumeRateLimit", () => {
  it("allows requests inside the window under the max", () => {
    const first = consumeRateLimit([], 1_000, 1_000, 2);
    const second = consumeRateLimit(first.next, 1_500, 1_000, 2);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("blocks when the max is reached and prunes old timestamps", () => {
    const blocked = consumeRateLimit([1_000, 1_400], 1_800, 1_000, 2);
    expect(blocked.allowed).toBe(false);

    const allowed = consumeRateLimit([1_000, 1_400], 2_200, 1_000, 2);
    expect(allowed.allowed).toBe(true);
    expect(allowed.next).toEqual([1_400, 2_200]);
  });
});
