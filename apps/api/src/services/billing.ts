import type {
  CheckoutSessionResponse,
  PortalSessionResponse,
  Subscription,
} from "@jobpilot/shared-types";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import type { Database } from "../db/client.js";
import { subscriptions, users } from "../db/schema.js";

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Stripe billing is not configured");
    this.name = "BillingNotConfiguredError";
  }
}

export interface BillingStore {
  getSubscription(userId: string): Promise<Subscription | null>;
  createCheckoutSession(userId: string): Promise<CheckoutSessionResponse>;
  createPortalSession(userId: string): Promise<PortalSessionResponse>;
  handleStripeEvent(event: Stripe.Event): Promise<void>;
}

function toSubscription(row: typeof subscriptions.$inferSelect): Subscription {
  return {
    userId: row.userId,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.currentPeriodEnd ? row.currentPeriodEnd.toISOString() : null,
  };
}

export function createBillingService(options: {
  db: Database;
  stripeSecretKey: string | undefined;
  stripePriceIdPro: string | undefined;
  appUrl: string;
}): BillingStore {
  const stripe = options.stripeSecretKey ? new Stripe(options.stripeSecretKey) : null;

  async function ensureCustomer(userId: string): Promise<string> {
    if (!stripe) {
      throw new BillingNotConfiguredError();
    }
    const [existing] = await options.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    if (existing?.stripeCustomerId) {
      return existing.stripeCustomerId;
    }

    const [user] = await options.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new Error("User not found");
    }

    const customer = await stripe.customers.create({
      email: user.email,
      ...(user.name ? { name: user.name } : {}),
      metadata: { clerkUserId: userId },
    });

    await options.db
      .insert(subscriptions)
      .values({
        userId,
        stripeCustomerId: customer.id,
        plan: "free",
        status: "incomplete",
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { stripeCustomerId: customer.id },
      });

    return customer.id;
  }

  return {
    async getSubscription(userId) {
      const [row] = await options.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);
      return row ? toSubscription(row) : null;
    },

    async createCheckoutSession(userId) {
      if (!stripe || !options.stripePriceIdPro) {
        throw new BillingNotConfiguredError();
      }
      const customerId = await ensureCustomer(userId);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: options.stripePriceIdPro, quantity: 1 }],
        success_url: `${options.appUrl}/billing?checkout=success`,
        cancel_url: `${options.appUrl}/billing?checkout=cancel`,
        metadata: { clerkUserId: userId },
      });
      if (!session.url) {
        throw new Error("Stripe checkout session missing URL");
      }
      return { url: session.url };
    },

    async createPortalSession(userId) {
      if (!stripe) {
        throw new BillingNotConfiguredError();
      }
      const customerId = await ensureCustomer(userId);
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${options.appUrl}/billing`,
      });
      return { url: session.url };
    },

    async handleStripeEvent(event) {
      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const [row] = await options.db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, customerId))
          .limit(1);
        if (!row) {
          return;
        }

        const active =
          subscription.status === "active" || subscription.status === "trialing";
        const plan = event.type === "customer.subscription.deleted" || !active ? "free" : "pro";
        const status =
          event.type === "customer.subscription.deleted"
            ? "canceled"
            : (subscription.status as typeof row.status);

        await options.db
          .update(subscriptions)
          .set({
            stripeSubscriptionId: subscription.id,
            plan,
            status,
            currentPeriodEnd: new Date(
              ((subscription as { current_period_end?: number }).current_period_end ?? 0) * 1000,
            ),
          })
          .where(eq(subscriptions.userId, row.userId));

        await options.db.update(users).set({ plan }).where(eq(users.id, row.userId));
      }
    },
  };
}
