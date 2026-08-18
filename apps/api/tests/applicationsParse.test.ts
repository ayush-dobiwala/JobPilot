import { describe, expect, it } from "vitest";
import { parseCreateBody, parseListQuery, parseUpdateBody } from "../src/lib/applicationsParse.js";

describe("parseListQuery", () => {
  it("applies defaults and caps page size", () => {
    const parsed = parseListQuery({ page: "0", pageSize: "500" });
    expect(parsed).toEqual({
      ok: true,
      value: { page: 1, pageSize: 100 },
    });
  });

  it("rejects unknown status", () => {
    const parsed = parseListQuery({ status: "pending" });
    expect(parsed.ok).toBe(false);
  });

  it("accepts a Kanban status and search", () => {
    const parsed = parseListQuery({ status: "interview", search: "  acme  " });
    expect(parsed).toEqual({
      ok: true,
      value: { page: 1, pageSize: 20, status: "interview", search: "acme" },
    });
  });
});

describe("parseCreateBody", () => {
  it("requires company and roleTitle", () => {
    expect(parseCreateBody({ company: "Acme" }).ok).toBe(false);
    expect(parseCreateBody({ roleTitle: "Engineer" }).ok).toBe(false);
  });

  it("accepts a valid payload", () => {
    const parsed = parseCreateBody({
      company: " Acme ",
      roleTitle: " Engineer ",
      status: "applied",
    });
    expect(parsed).toEqual({
      ok: true,
      value: { company: "Acme", roleTitle: "Engineer", status: "applied" },
    });
  });
});

describe("parseUpdateBody", () => {
  it("requires at least one field", () => {
    expect(parseUpdateBody({}).ok).toBe(false);
  });

  it("accepts a status change", () => {
    const parsed = parseUpdateBody({ status: "rejected", notes: null });
    expect(parsed).toEqual({
      ok: true,
      value: { status: "rejected", notes: null },
    });
  });

  it("rejects an out-of-range match score", () => {
    expect(parseUpdateBody({ matchScore: 140 }).ok).toBe(false);
  });
});
