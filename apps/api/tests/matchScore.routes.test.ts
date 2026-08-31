import { beforeEach, describe, expect, it } from "vitest";
import { MemoryUserStore } from "./memoryStores.js";
import { MemoryMatchScoreStore, MemoryResumeStore } from "./memoryMatchStores.js";
import { createTestApp } from "./testHelpers.js";

describe("match score routes", () => {
  let users: MemoryUserStore;
  let resumes: MemoryResumeStore;
  let matchScore: MemoryMatchScoreStore;

  beforeEach(async () => {
    users = new MemoryUserStore();
    resumes = new MemoryResumeStore();
    matchScore = new MemoryMatchScoreStore();
    await users.provision({ id: "user_test", email: "ada@example.com", name: "Ada" });
  });

  function app() {
    return createTestApp({ users, resumes, matchScore });
  }

  it("returns monthly usage", async () => {
    const response = await app().request("/api/match-score/usage");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ used: 0, limit: 5, plan: "free" });
  });

  it("scores a resume against a job description", async () => {
    const created = await resumes.create("user_test", {
      parsedText: "Built APIs with TypeScript",
    });
    const response = await app().request("/api/match-score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resumeId: created.id,
        jobDescription: "Looking for a backend engineer with Kubernetes",
      }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { score: number };
    expect(body.score).toBe(77);
    expect(matchScore.used).toBe(1);
  });
});

describe("resumes routes", () => {
  let resumes: MemoryResumeStore;

  beforeEach(() => {
    resumes = new MemoryResumeStore();
  });

  function app() {
    return createTestApp({ resumes });
  }

  it("creates and lists resumes", async () => {
    const createResponse = await app().request("/api/resumes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parsedText: "Resume body", isPrimary: true }),
    });
    expect(createResponse.status).toBe(201);

    const listResponse = await app().request("/api/resumes");
    expect(listResponse.status).toBe(200);
    const body = (await listResponse.json()) as { data: { parsedText: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.parsedText).toBe("Resume body");
  });

  it("rejects upload without a file", async () => {
    const form = new FormData();
    const response = await app().request("/api/resumes/upload", {
      method: "POST",
      body: form,
    });
    expect(response.status).toBe(400);
  });
});
