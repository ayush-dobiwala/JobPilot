import "./lib/loadEnv.js";
import { Webhook } from "svix";
import Stripe from "stripe";
import { db } from "./db/client.js";
import { createApp } from "./app.js";
import { requireAuth } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { createBullMqQueue, createMemoryQueue } from "./queue/bullmq.js";
import { createAnalyticsService } from "./services/analytics.js";
import { createApplicationsService } from "./services/applications.js";
import { createAutomationService, processAutomationJob } from "./services/automation.js";
import { createBillingService } from "./services/billing.js";
import { createMatchScoreService } from "./services/matchScore.js";
import {
  createAnthropicMatchScorer,
  createMockMatchScorer,
  createOpenAIMatchScorer,
  type MatchScorer,
} from "./services/matchScorer.js";
import { createProfilesService } from "./services/profiles.js";
import { createResumesService } from "./services/resumes.js";
import { createUsersService } from "./services/users.js";

function verifyClerkWebhook(payload: string, headers: Headers): unknown {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    throw new Error("CLERK_WEBHOOK_SIGNING_SECRET is not set");
  }

  const webhook = new Webhook(secret);
  return webhook.verify(payload, {
    "svix-id": headers.get("svix-id") ?? "",
    "svix-timestamp": headers.get("svix-timestamp") ?? "",
    "svix-signature": headers.get("svix-signature") ?? "",
  });
}

async function verifyStripeWebhook(payload: string, signature: string): Promise<unknown> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    throw new Error("Stripe webhook is not configured");
  }
  const stripe = new Stripe(stripeKey);
  // Bun uses SubtleCrypto — constructEvent is sync-only and throws here.
  return stripe.webhooks.constructEventAsync(payload, signature, secret);
}

function resolveMatchScorer(): { scorer: MatchScorer; label: string } {
  const forceMock = process.env.MOCK_MATCH_SCORER === "true";
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (forceMock) {
    return { scorer: createMockMatchScorer(), label: "mock (MOCK_MATCH_SCORER=true)" };
  }
  if (openaiKey) {
    const isOpenRouter = openaiKey.startsWith("sk-or-");
    const model = process.env.OPENAI_MODEL ?? (isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini");
    return {
      scorer: createOpenAIMatchScorer(openaiKey, {
        ...(process.env.OPENAI_BASE_URL ? { baseUrl: process.env.OPENAI_BASE_URL } : {}),
        model,
      }),
      label: isOpenRouter ? `openrouter (${model})` : `openai (${model})`,
    };
  }
  if (anthropicKey) {
    return { scorer: createAnthropicMatchScorer(anthropicKey), label: "anthropic (claude)" };
  }
  return { scorer: createMockMatchScorer(), label: "mock (no LLM key)" };
}

const { scorer, label: scorerLabel } = resolveMatchScorer();
console.log(`Match scorer: ${scorerLabel}`);

const workerBaseUrl = process.env.WORKER_INTERNAL_URL ?? "http://localhost:8000";
const redisUrl = process.env.REDIS_URL;
const resumes = createResumesService(db);
const queueBundle = redisUrl
  ? createBullMqQueue(redisUrl, db, workerBaseUrl)
  : {
      queue: createMemoryQueue((payload) => processAutomationJob(db, workerBaseUrl, payload)),
      worker: null,
    };

if (!redisUrl) {
  console.warn("REDIS_URL is not set — automation jobs run in-process via memory queue.");
}

const billing = createBillingService({
  db,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePriceIdPro: process.env.STRIPE_PRICE_ID_PRO,
  appUrl: process.env.WEB_APP_URL ?? "http://localhost:5173",
});

export const app = createApp({
  applications: createApplicationsService(db),
  users: createUsersService(db),
  resumes,
  matchScore: createMatchScoreService(db, resumes, scorer),
  automation: createAutomationService(db, queueBundle.queue, workerBaseUrl),
  analytics: createAnalyticsService(db),
  billing,
  profiles: createProfilesService(db),
  requireAuth,
  rateLimit: rateLimit({ windowMs: 60_000, max: 120 }),
  verifyClerkWebhook,
  verifyStripeWebhook,
});

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`JobPilot API listening on http://localhost:${port}`);
console.log(`Worker base URL: ${workerBaseUrl}`);
