import { describe, expect, it } from "vitest";
import { groupApplicationsByStatus } from "./applicationsApi.js";
import type { Application } from "@jobpilot/shared-types";

const sample = (status: Application["status"], id: string): Application => ({
  id,
  userId: "user_1",
  company: "Acme",
  roleTitle: "Engineer",
  jobUrl: null,
  status,
  appliedAt: null,
  source: "manual",
  matchScore: null,
  notes: null,
  salaryRange: null,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("groupApplicationsByStatus", () => {
  it("groups cards into Kanban columns", () => {
    const grouped = groupApplicationsByStatus([
      sample("wishlist", "1"),
      sample("applied", "2"),
      sample("applied", "3"),
      sample("interview", "4"),
    ]);
    expect(grouped.wishlist).toHaveLength(1);
    expect(grouped.applied).toHaveLength(2);
    expect(grouped.interview).toHaveLength(1);
    expect(grouped.offer).toHaveLength(0);
    expect(grouped.rejected).toHaveLength(0);
  });
});
