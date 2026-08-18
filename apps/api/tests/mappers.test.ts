import { describe, expect, it } from "vitest";
import { toApplication, toUser } from "../src/lib/mappers.js";
import type { ApplicationRow, UserRow } from "../src/db/schema.js";

describe("toApplication", () => {
  it("serializes timestamps to ISO strings", () => {
    const createdAt = new Date("2026-01-15T12:00:00.000Z");
    const row: ApplicationRow = {
      id: "app_1",
      userId: "user_1",
      company: "Acme",
      roleTitle: "Engineer",
      jobUrl: null,
      status: "wishlist",
      appliedAt: null,
      source: "manual",
      matchScore: null,
      notes: null,
      salaryRange: null,
      createdAt,
    };

    expect(toApplication(row)).toMatchObject({
      id: "app_1",
      company: "Acme",
      createdAt: "2026-01-15T12:00:00.000Z",
      appliedAt: null,
    });
  });
});

describe("toUser", () => {
  it("maps a user row", () => {
    const row: UserRow = {
      id: "user_1",
      email: "ada@example.com",
      name: "Ada",
      plan: "free",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
    };
    expect(toUser(row)).toEqual({
      id: "user_1",
      email: "ada@example.com",
      name: "Ada",
      plan: "free",
      createdAt: "2026-01-15T12:00:00.000Z",
    });
  });
});
