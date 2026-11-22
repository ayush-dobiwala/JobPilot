import { createClerkClient } from "@clerk/backend";
import type { ProvisionUserInput } from "../services/users.js";

export type ResolveClerkUser = (clerkUserId: string) => Promise<Omit<ProvisionUserInput, "id">>;

export function createClerkUserResolver(secretKey: string | undefined): ResolveClerkUser {
  const clerk = secretKey ? createClerkClient({ secretKey }) : null;

  return async (clerkUserId) => {
    if (!clerk) {
      return {
        email: `${clerkUserId}@users.clerk`,
        name: null,
      };
    }

    const clerkUser = await clerk.users.getUser(clerkUserId);
    const primary =
      clerkUser.emailAddresses.find((entry) => entry.id === clerkUser.primaryEmailAddressId) ??
      clerkUser.emailAddresses[0];
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();

    return {
      email: primary?.emailAddress ?? `${clerkUserId}@users.clerk`,
      name: name.length > 0 ? name : null,
    };
  };
}
