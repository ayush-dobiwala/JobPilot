export interface ClerkEmailAddress {
  email_address: string;
}

export interface ClerkUserData {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  first_name?: string | null;
  last_name?: string | null;
}

export interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

export function parseClerkWebhookEvent(value: unknown): ClerkWebhookEvent | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.type !== "string") {
    return null;
  }

  if (typeof record.data !== "object" || record.data === null) {
    return null;
  }

  const data = record.data as Record<string, unknown>;
  if (typeof data.id !== "string" || data.id === "") {
    return null;
  }

  const emailAddresses: ClerkEmailAddress[] = [];
  if (Array.isArray(data.email_addresses)) {
    for (const entry of data.email_addresses) {
      if (typeof entry === "object" && entry !== null && "email_address" in entry) {
        const email = (entry as { email_address: unknown }).email_address;
        if (typeof email === "string") {
          emailAddresses.push({ email_address: email });
        }
      }
    }
  }

  const result: ClerkWebhookEvent = {
    type: record.type,
    data: { id: data.id },
  };

  if (emailAddresses.length > 0) {
    result.data.email_addresses = emailAddresses;
  }
  if (typeof data.first_name === "string" || data.first_name === null) {
    result.data.first_name = data.first_name;
  }
  if (typeof data.last_name === "string" || data.last_name === null) {
    result.data.last_name = data.last_name;
  }

  return result;
}

export function mapUserCreated(event: ClerkWebhookEvent): {
  id: string;
  email: string;
  name: string | null;
} | null {
  if (event.type !== "user.created") {
    return null;
  }

  const email = event.data.email_addresses?.[0]?.email_address;
  if (!email) {
    return null;
  }

  const first = event.data.first_name?.trim() ?? "";
  const last = event.data.last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();

  return {
    id: event.data.id,
    email,
    name: combined === "" ? null : combined,
  };
}
