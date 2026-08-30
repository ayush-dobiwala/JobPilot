# JobPilot — Priority A: free deploy (no Vercel)

Honest upfront: **a real `.com` domain is almost never free forever** (Freenom is dead/unreliable).  
What *is* free and portfolio-quality:

| Piece | Free host | Free URL you get |
|-------|-----------|------------------|
| Web (Vite SPA) | **Cloudflare Pages** | `https://jobpilot-xxxx.pages.dev` |
| API (Bun) | **Render** free web service | `https://jobpilot-api.onrender.com` |
| Worker (Python+Chrome) | **Render** free Docker | `https://jobpilot-worker.onrender.com` |
| Redis | **Upstash** free | redis URL in dashboard |
| Postgres | **Supabase** (you already have) | unchanged |

Cold starts on Render free: first request after idle can take ~30–60s. Fine for demos; say “spinning up” once.

Optional later (~$10/yr): buy `yourname.dev` on Cloudflare Registrar and point it at Pages.

---

## 0. Before you start

1. Merge `feat/match-scorer` into `main` on GitHub.
2. Locally:

```bash
git checkout main
git pull origin main
```

3. Keep `.env` secrets ready (Clerk, Supabase, OpenRouter, etc.) — you’ll paste them into host dashboards, **never** into git.

---

## 1. Upstash Redis (free)

1. Go to [https://upstash.com](https://upstash.com) → Sign up (GitHub OK)
2. **Create database** → region close to you → Free
3. Copy **Redis URL** (`rediss://...`) → save as `REDIS_URL`

---

## 2. Deploy API on Render

1. [https://render.com](https://render.com) → Sign up with GitHub
2. **New +** → **Web Service** → connect **JobPilot** repo
3. Settings:

| Field | Value |
|-------|--------|
| Name | `jobpilot-api` |
| Region | Oregon (or closest) |
| Branch | `main` |
| Runtime | **Docker** |
| Dockerfile path | `apps/api/Dockerfile` |
| Docker context | `.` (repo root) |
| Instance | **Free** |

4. **Environment** → add (same values as local `.env`, production URLs where noted):

```text
DATABASE_URL=...
CLERK_SECRET_KEY=...
CLERK_PUBLISHABLE_KEY=...
CLERK_WEBHOOK_SIGNING_SECRET=...   # update webhook URL after API is live
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
REDIS_URL=...                      # Upstash
OPENAI_API_KEY=...
OPENAI_MODEL=openai/gpt-4o-mini
MOCK_MATCH_SCORER=false
WORKER_INTERNAL_URL=https://jobpilot-worker.onrender.com
WEB_APP_URL=https://YOUR-PAGES-SUBDOMAIN.pages.dev
PORT=3001
```

5. Deploy → wait for green. Open `https://jobpilot-api.onrender.com/health` → `{"status":"ok"}`

6. Run migrations **once** against production DB (from your laptop):

```bash
# temporarily point DATABASE_URL at the same Supabase URL, then:
cd apps/api && bun run db:migrate
```

(If you already migrated locally on the same Supabase project, you’re done.)

---

## 3. Deploy Worker on Render

1. **New +** → **Web Service** → same repo
2. Settings:

| Field | Value |
|-------|--------|
| Name | `jobpilot-worker` |
| Runtime | **Docker** |
| Dockerfile path | `apps/worker/Dockerfile` |
| Docker context | `apps/worker` |
| Instance | **Free** |

3. Env:

```text
REDIS_URL=...same Upstash...
WORKER_INTERNAL_URL=https://jobpilot-worker.onrender.com
CHROME_BIN=/usr/bin/chromium
```

4. Health: `https://jobpilot-worker.onrender.com/health`

**Note:** Free tier RAM is tight for Chrome. Autofill may be slow or OOM once; scrape (no Chrome) is reliable. For demos, wake the worker first by hitting `/health`.

---

## 4. Deploy Web on Cloudflare Pages (free domain-ish URL)

1. [https://dash.cloudflare.com](https://dash.cloudflare.com) → Sign up
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → JobPilot
3. Build settings:

| Field | Value |
|-------|--------|
| Framework preset | Vite |
| Build command | `bun install && bun run --filter @jobpilot/shared-types build && bun run --filter @jobpilot/web build` |
| Build output directory | `apps/web/dist` |
| Root directory | `/` (monorepo root) |

If Cloudflare doesn’t have Bun by default, use:

| Field | Value |
|-------|--------|
| Build command | `npm i -g bun && bun install && bun run --filter @jobpilot/shared-types build && bun run --filter @jobpilot/web build` |
| Output | `apps/web/dist` |

4. **Environment variables** (Production):

```text
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_API_URL=https://jobpilot-api.onrender.com
```

5. Deploy → you get **`https://<project>.pages.dev`** ← this is your free public site URL.

6. Update Render API env `WEB_APP_URL` to that Pages URL → **Manual Deploy** API once.

---

## 5. Point Clerk at production

1. [Clerk Dashboard](https://dashboard.clerk.com) → your app
2. **Domains** / allowed origins: add `https://<project>.pages.dev`
3. **Paths** are in code already (`/sign-in`, `/sign-up`, `/dashboard`)
4. **Webhooks** → endpoint:  
   `https://jobpilot-api.onrender.com/api/webhooks/clerk`  
   Event: `user.created`  
   Copy new signing secret into Render `CLERK_WEBHOOK_SIGNING_SECRET` if it changes

---

## 6. Smoke test production

1. Open `https://<project>.pages.dev`
2. Sign up / sign in
3. Create an application on Kanban
4. Match Scorer (uses OpenRouter key on the API)
5. Automation scrape (wake worker `/health` first if cold)

---

## 7. Put the demo link in README

At the top of `README.md`:

```markdown
**Live demo:** https://<project>.pages.dev
```

Optional: 60-second Loom of Match Scorer + Autofill → link under the demo.

---

## Free “custom” subdomain options (optional)

If you dislike `*.pages.dev`:

| Service | What you get | Notes |
|---------|--------------|--------|
| Cloudflare Pages | `you.pages.dev` | Best free default |
| Render | `you.onrender.com` | Can host static too; colder |
| [is-a.dev](https://is-a.dev) | `you.is-a.dev` | Free subdomain for GitHub users; approval process |

Avoid Freenom / random “free .tk” sites.

---

## Cost reality

| Item | Cost |
|------|------|
| Cloudflare Pages + Render free + Upstash free + Supabase free | **$0** |
| Real domain (`jobpilot.dev`) | ~$10/year (optional polish) |
| Render paid (no sleep) | optional later |

---

## After Priority A → B → C → D

- **B Stripe:** test keys + webhook to `https://jobpilot-api.onrender.com/api/webhooks/stripe`
- **C Polish:** landing GIF, screenshots, README hero
- **D Mobile:** Expo Phase 2

When you’re ready to start A, do steps **1 → 2** (Upstash + API) first and paste any Render build error here.
