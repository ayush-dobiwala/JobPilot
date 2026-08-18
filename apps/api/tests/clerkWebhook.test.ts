import { describe, expect, it } from "vitest";
import { mapUserCreated, parseClerkWebhookEvent } from "../src/lib/clerkWebhook.js";

describe("parseClerkWebhookEvent", () => {
  it("reads a user.created payload", () => {
    const event = parseClerkWebhookEvent({
      type: "user.created",
      data: {
        id: "user_123",
        email_addresses: [{ email_address: "ada@example.com" }],
        first_name: "Ada",
        last_name: "Lovelace",
      },
    });
    expect(event?.type).toBe("user.created");
    expect(event?.data.id).toBe("user_123");
  });

  it("rejects malformed payloads", () => {
    expect(parseClerkWebhookEvent(null)).toBeNull();
    expect(parseClerkWebhookEvent({ type: "user.created" })).toBeNull();
  });
});

describe("mapUserCreated", () => {
  it("maps name and email", () => {
    const mapped = mapUserCreated({
      type: "user.created",
      data: {
        id: "user_123",
        email_addresses: [{ email_address: "ada@example.com" }],
        first_name: "Ada",
        last_name: "Lovelace",
      },
    });
    expect(mapped).toEqual({
      id: "user_123",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
  });

  it("ignores other event types", () => {
    expect(
      mapUserCreated({
        type: "user.updated",
        data: { id: "user_123", email_addresses: [{ email_address: "ada@example.com" }] },
      }),
    ).toBeNull();
  });
});
