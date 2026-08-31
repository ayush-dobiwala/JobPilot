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
      body: JSON.stringify({
        parsedText: "Resume body",
        label: "Backend — APIs",
        isPrimary: true,
      }),
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { label: string };
    expect(created.label).toBe("Backend — APIs");

    const listResponse = await app().request("/api/resumes");
    expect(listResponse.status).toBe(200);
    const body = (await listResponse.json()) as { data: { parsedText: string; label: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.parsedText).toBe("Resume body");
    expect(body.data[0]?.label).toBe("Backend — APIs");
  });

  it("rejects upload without a file", async () => {
    const form = new FormData();
    const response = await app().request("/api/resumes/upload", {
      method: "POST",
      body: form,
    });
    expect(response.status).toBe(400);
  });

  it("uploads a PDF and stores parsed text with label", async () => {
    // Minimal PDF with extractable text (same fixture shape as local parse tests)
    const pdf = Buffer.from(`%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 55 >>stream
BT /F1 24 Tf 100 700 Td (Hello Resume Candidate) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000371 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
444
%%EOF`);
    const form = new FormData();
    form.append("file", new File([pdf], "ayush-resume.pdf", { type: "application/pdf" }));
    form.append("label", "Frontend — React");
    form.append("isPrimary", "true");

    const response = await app().request("/api/resumes/upload", {
      method: "POST",
      body: form,
    });
    expect(response.status).toBe(201);
    const created = (await response.json()) as {
      label: string;
      parsedText: string;
      storagePath: string;
    };
    expect(created.label).toBe("Frontend — React");
    expect(created.parsedText).toContain("Hello Resume Candidate");
    expect(created.storagePath).toContain("upload/");

    const listResponse = await app().request("/api/resumes");
    const body = (await listResponse.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });

  it("renames and deletes a resume", async () => {
    const createResponse = await app().request("/api/resumes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parsedText: "Body", label: "Old name" }),
    });
    const created = (await createResponse.json()) as { id: string };

    const patchResponse = await app().request(`/api/resumes/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "DevOps — cloud" }),
    });
    expect(patchResponse.status).toBe(200);
    const patched = (await patchResponse.json()) as { label: string };
    expect(patched.label).toBe("DevOps — cloud");

    const deleteResponse = await app().request(`/api/resumes/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteResponse.status).toBe(200);
    const deletedBody = (await deleteResponse.json()) as { ok: boolean };
    expect(deletedBody.ok).toBe(true);

    const listResponse = await app().request("/api/resumes");
    const body = (await listResponse.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });
});
