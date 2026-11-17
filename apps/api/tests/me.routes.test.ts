import { beforeEach, describe, expect, it } from "vitest";
import { MemoryApplicationStore, MemoryUserStore } from "./memoryStores.js";
import { createTestApp } from "./testHelpers.js";
import type { createApp } from "../src/app.js";

describe("GET /api/me", () => {
  let users: MemoryUserStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    users = new MemoryUserStore();
    app = createTestApp({
      applications: new MemoryApplicationStore(),
      users,
    });
  });

  it("auto-provisions the current Clerk user when missing", async () => {
    const response = await app.request("/api/me");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { email: string; plan: string; name: string | null };
    expect(body.email).toBe("user_test@example.com");
    expect(body.name).toBe("Test User");
    expect(body.plan).toBe("free");
  });

  it("returns the provisioned user for the current Clerk id", async () => {
    await users.provision({
      id: "user_test",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });

    const response = await app.request("/api/me");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { email: string; plan: string };
    expect(body.email).toBe("ada@example.com");
    expect(body.plan).toBe("free");
  });
});
