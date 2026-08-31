# JobPilot — Keys & setup (click-by-click)

You already have **Clerk** + **Supabase** working. Below is everything else, plus refreshers.

Never commit `.env`. Copy from `.env.example` if needed.

---

## 0. Apply pending DB migration (required for Match Scorer)

From repo root:

```bash
bun run --filter @jobpilot/api db:migrate
```

This creates `match_score_runs`.

---

## 1. LLM API key (OpenAI college credit OR Anthropic)

Match Scorer needs **one** of:

| Option | Cost | Env |
|--------|------|-----|
| **OpenAI** (college $ credit) | Uses your school credit | `OPENAI_API_KEY` + `MOCK_MATCH_SCORER=false` |
| **Anthropic Claude** | Often needs paid balance | `ANTHROPIC_API_KEY` |
| **Mock** | Free, weaker results | `MOCK_MATCH_SCORER=true` |

### Use your college key (OpenAI or OpenRouter)

1. Copy the key your college gave you.
2. In repo-root `.env`:

**OpenRouter** keys start with `sk-or-...` (common for school portals):

```env
OPENAI_API_KEY=sk-or-...your-college-key...
OPENAI_MODEL=openai/gpt-4o-mini
MOCK_MATCH_SCORER=false
```

JobPilot auto-routes `sk-or-` keys to `https://openrouter.ai/api/v1`.

**Direct OpenAI** keys start with `sk-` (not `sk-or-` / `sk-ant-`):

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
MOCK_MATCH_SCORER=false
```

3. If they gave an **Azure** / custom portal URL:

```env
OPENAI_BASE_URL=https://whatever-your-school-says/v1
```

4. Restart the API. Log should say `Match scorer: openrouter (...)` or `openai (...)`.

`gpt-4o-mini` / `openai/gpt-4o-mini` is cheap — $25 lasts a long time for match scoring.

### Anthropic free credit?

Often **not available** anymore; console may require a card. You do **not** need Anthropic if OpenAI works.

### Anthropic (optional)

1. [console.anthropic.com](https://console.anthropic.com) → API keys  
2. `ANTHROPIC_API_KEY=sk-ant-...` and leave `OPENAI_API_KEY` empty (OpenAI is preferred when both are set)

---

## 2. Redis (automation queue)

1. Install Docker Desktop if needed
2. From repo root:

```bash
docker compose up -d
```

3. In `.env`:

```env
REDIS_URL=redis://localhost:6379
```

If Redis is missing, the API falls back to an in-process memory queue (fine for solo testing).

---

## 3. Python worker

```bash
cd apps/worker
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Chrome/Chromium is required for Selenium autofill. On macOS, Google Chrome is usually enough (`webdriver-manager` fetches the driver).

Demo form: [http://localhost:8000/fixtures/demo-apply.html](http://localhost:8000/fixtures/demo-apply.html)

In `.env`:

```env
WORKER_INTERNAL_URL=http://localhost:8000
```

---

## 4. Stripe (billing / Pro plan)

### Create account + keys

1. Open [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complete signup
3. Stay in **Test mode** (toggle top-right)
4. Developers → **API keys**
5. Copy **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`

### Create Pro price

1. Product catalog → **Products** → **Add product**
2. Name: `JobPilot Pro`
3. Pricing: **Recurring**, **$15.00 / month** (or your choice)
4. Save → copy the **Price ID** (`price_...`) → `STRIPE_PRICE_ID_PRO`

### Webhook (local with Stripe CLI)

1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. `stripe login`
3. Forward webhooks:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

4. CLI prints `whsec_...` → put in `STRIPE_WEBHOOK_SECRET`

### App URL

```env
WEB_APP_URL=http://localhost:5173
```

### Test cards

Checkout test card: `4242 4242 4242 4242`, any future expiry, any CVC.

---

## 5. Clerk (refresher)

Already set for you. For a new machine:

1. [https://dashboard.clerk.com](https://dashboard.clerk.com) → create application
2. **API Keys** → Publishable + Secret → `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
3. **Webhooks** → endpoint `https://<ngrok>/api/webhooks/clerk` → event `user.created`
4. Signing secret → `CLERK_WEBHOOK_SIGNING_SECRET`

---

## 6. Supabase (refresher)

1. Project Settings → API → Project URL → `SUPABASE_URL`
2. Service role key → `SUPABASE_SERVICE_ROLE_KEY`
3. Database → Connection string → **Session pooler** → `DATABASE_URL`

---

## 7. Run everything locally

Terminal A:

```bash
docker compose up -d
bun install
bun run --filter @jobpilot/api db:migrate
bun run --filter @jobpilot/api dev
```

Terminal B:

```bash
bun run --filter @jobpilot/web dev
```

Terminal C (worker):

```bash
cd apps/worker && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

Open [http://localhost:5173](http://localhost:5173).

---

## 8. Deploy (Step 11 checklist)

Suggested free/cheap stack:

| Piece | Host |
|-------|------|
| Web | Vercel / Netlify / Cloudflare Pages |
| API | Railway / Fly.io / Render |
| Worker | Railway / Fly.io (needs Chrome) |
| Redis | Upstash or Railway Redis |
| Postgres | Supabase (already) |

1. Create projects on each host
2. Set the same env vars (use production Clerk/Stripe keys when ready)
3. Point Clerk + Stripe webhooks at `https://<api-host>/api/webhooks/...`
4. Set `WEB_APP_URL` and `WORKER_INTERNAL_URL` to production URLs
5. Run migrations against production `DATABASE_URL`
6. Paste the live demo URL into `README.md`

---

## Users never need these keys

End users only sign in with Clerk on your site. Your server holds Anthropic/Stripe/Supabase secrets.
