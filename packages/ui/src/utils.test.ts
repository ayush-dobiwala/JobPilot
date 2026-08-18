import { describe, expect, it } from "vitest";
import { cn } from "./utils.js";

describe("cn", () => {
  it("joins truthy class names and drops falsy values", () => {
    const hidden = false;
    expect(cn("px-2", hidden && "hidden", "py-1")).toBe("px-2 py-1");
  });

  it("lets later Tailwind utilities win", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
