#!/usr/bin/env python3
"""Generate JobPilot Complete Application Guide PDF (beginner-friendly)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".pdf-tools"))

from fpdf import FPDF  # noqa: E402

OUT = ROOT / "docs" / "JobPilot-Complete-Application-Guide.pdf"


class GuidePDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "JobPilot Complete Application Guide", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        self.cell(0, 8, "Private portfolio project guide - for owner study only", align="C")


def _reset_x(pdf: GuidePDF) -> None:
    pdf.set_x(pdf.l_margin)


def h1(pdf: GuidePDF, text: str) -> None:
    pdf.ln(4)
    _reset_x(pdf)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(15, 118, 110)
    pdf.multi_cell(0, 9, text)
    pdf.ln(2)
    pdf.set_text_color(30, 30, 30)


def h2(pdf: GuidePDF, text: str) -> None:
    pdf.ln(3)
    _reset_x(pdf)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(20, 80, 90)
    pdf.multi_cell(0, 7, text)
    pdf.ln(1)
    pdf.set_text_color(30, 30, 30)


def h3(pdf: GuidePDF, text: str) -> None:
    pdf.ln(2)
    _reset_x(pdf)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(0, 6, text)
    pdf.set_text_color(30, 30, 30)


def body(pdf: GuidePDF, text: str) -> None:
    _reset_x(pdf)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5.5, text)
    pdf.ln(1)


def bullet(pdf: GuidePDF, text: str) -> None:
    pdf.set_font("Helvetica", "", 10)
    pdf.set_x(pdf.l_margin + 3)
    available = pdf.w - pdf.r_margin - (pdf.l_margin + 3)
    pdf.multi_cell(available, 5.5, f"- {text}")


def code(pdf: GuidePDF, text: str) -> None:
    pdf.set_font("Courier", "", 8.5)
    pdf.set_fill_color(245, 247, 250)
    _reset_x(pdf)
    pdf.multi_cell(0, 4.5, text, fill=True)
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)


def kv(pdf: GuidePDF, key: str, value: str) -> None:
    _reset_x(pdf)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5.5, f"{key}: {value}")


def build() -> Path:
    pdf = GuidePDF(format="Letter")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(16, 16, 16)
    pdf.add_page()

    # Cover
    pdf.ln(28)
    _reset_x(pdf)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(15, 118, 110)
    pdf.cell(0, 12, "JobPilot", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 8, "Complete Application Guide", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(80, 80, 80)
    _reset_x(pdf)
    pdf.multi_cell(
        0,
        6,
        "A beginner-friendly map of the whole product:\n"
        "what it is, how it is built, which languages, which folders,\n"
        "how each feature works, and how to run it.",
        align="C",
    )
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 10)
    _reset_x(pdf)
    pdf.cell(0, 5.5, "Live demo: https://jobpilot-a7i.pages.dev", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5.5, "Repo: JobPilot monorepo (Bun + Turborepo)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(
        0,
        5.5,
        "Audience: owner with little prior knowledge of this codebase",
        align="C",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 9)
    _reset_x(pdf)
    pdf.multi_cell(
        0,
        5,
        "Tip: read section by section. You do not need to memorize every file.\n"
        "Focus on the flows (auth, applications, match score, billing).",
        align="C",
    )

    # 1. What is JobPilot
    pdf.add_page()
    h1(pdf, "1. What is JobPilot?")
    body(
        pdf,
        "JobPilot is a SaaS web app for job seekers. It replaces messy spreadsheets with one place to "
        "track applications, check how well a resume matches a job description (AI), manage a profile, "
        "and (later) help fill application forms with human approval.",
    )
    h3(pdf, "Core product ideas")
    bullet(pdf, "Kanban tracker: Wishlist -> Applied -> Interview -> Offer -> Rejected")
    bullet(pdf, "AI Match Scorer: resume vs job description score + missing keywords + suggestions")
    bullet(pdf, "Add jobs from a posting URL (company/title extracted for you)")
    bullet(pdf, "Profile + billing (Free vs Pro via Stripe)")
    bullet(pdf, "Automation / auto-submit: marked Coming Soon in the UI (backend still exists)")
    h3(pdf, "Design principle: human-in-the-loop")
    body(
        pdf,
        "Blind auto-apply bots are unreliable and often against ATS terms. JobPilot was designed so a "
        "human stays in control of final submit. That is why Automation is Coming Soon as a careful feature, "
        "not a spam button.",
    )

    # 2. Big picture architecture
    h1(pdf, "2. Big-picture architecture")
    body(pdf, "Think of JobPilot as four cooperating apps plus shared packages:")
    code(
        pdf,
        "Browser (React web)\n"
        "   |  HTTPS + Clerk JWT\n"
        "API (Bun + Hono + Drizzle)  ----  Supabase Postgres\n"
        "   |                              Stripe / Clerk webhooks\n"
        "   +---- Redis/BullMQ (optional queue)\n"
        "   |\n"
        "Worker (Python FastAPI + Selenium)  ---- scrape / autofill / demo form",
    )
    h3(pdf, "Who talks to whom")
    bullet(pdf, "Web never talks to the database directly. It only calls the API.")
    bullet(pdf, "API owns business rules, auth checks, Stripe/Clerk, and DB writes.")
    bullet(pdf, "Worker does browser/automation work the API should not do.")
    bullet(pdf, "Clerk handles login. Supabase is Postgres (+ storage), not Supabase Auth.")
    bullet(pdf, "Every user-owned row is filtered by user_id in the API (not Postgres RLS).")

    # 3. Languages and stack
    h1(pdf, "3. Languages and tech stack")
    kv(pdf, "Frontend language", "TypeScript + React (JSX/TSX)")
    kv(pdf, "Frontend tools", "Vite, React Router, Tailwind CSS, shadcn/ui, Framer Motion, Recharts")
    kv(pdf, "API language", "TypeScript on Bun runtime")
    kv(pdf, "API tools", "Hono (HTTP), Drizzle ORM, Vitest, Stripe SDK, Clerk backend")
    kv(pdf, "Worker language", "Python 3.11")
    kv(pdf, "Worker tools", "FastAPI, Selenium, httpx, Pytest, Ruff, Mypy")
    kv(pdf, "Database", "PostgreSQL on Supabase (Session Pooler URI recommended)")
    kv(pdf, "Auth", "Clerk (sign-in widgets + JWT verification)")
    kv(pdf, "Payments", "Stripe Checkout + Customer Portal + webhooks (test mode locally)")
    kv(pdf, "AI", "OpenAI-compatible / OpenRouter (optional Anthropic / mock scorer)")
    kv(pdf, "Queue", "BullMQ + Redis (Upstash in prod); memory fallback possible")
    kv(pdf, "Monorepo", "Bun workspaces + Turborepo")
    kv(pdf, "CI", "GitHub Actions: lint, typecheck, test, format, ruff/mypy/pytest")
    kv(pdf, "Deploy", "Cloudflare Pages (web), Render (API + worker), Supabase, Upstash")

    # 4. Folder map
    h1(pdf, "4. Repository folder map (where things live)")
    code(
        pdf,
        "JobPilot/\n"
        "  apps/web/          React website (what users see)\n"
        "  apps/api/           Backend HTTP API\n"
        "  apps/worker/        Python automation service\n"
        "  apps/mobile/        Expo mobile (Phase 2 placeholder)\n"
        "  packages/shared-types/  Types shared by web + API\n"
        "  packages/ui/            Shared UI building blocks\n"
        "  packages/config/        Shared TS/ESLint/Prettier configs\n"
        "  docs/                   Deploy + setup guides (+ this PDF)\n"
        "  .github/workflows/      CI and deploy workflows\n"
        "  .env                    Your secrets (NEVER commit)\n"
        "  package.json            Root scripts: bun dev, test, format",
    )
    h2(pdf, "4.1 Frontend important locations")
    bullet(pdf, "apps/web/src/App.tsx - all routes")
    bullet(pdf, "apps/web/src/app/*/ - each page (landing, dashboard, applications, ...)")
    bullet(pdf, "apps/web/src/components/kanban/ - board UI")
    bullet(pdf, "apps/web/src/components/layout/ - AppShell, ProtectedRoute, ComingSoon")
    bullet(pdf, "apps/web/src/hooks/ - data loading hooks (useApplications, useCurrentUser, ...)")
    bullet(pdf, "apps/web/src/lib/ - API helpers (api.ts, applicationsApi.ts, platformApi.ts, ...)")
    bullet(pdf, "apps/web/src/stores/theme.ts - light/dark theme")
    h2(pdf, "4.2 API important locations")
    bullet(pdf, "apps/api/src/index.ts - starts server, wires services + env")
    bullet(pdf, "apps/api/src/app.ts - mounts all routes + middleware")
    bullet(pdf, "apps/api/src/middleware/auth.ts - verifies Clerk JWT")
    bullet(pdf, "apps/api/src/routes/*.ts - HTTP endpoints")
    bullet(pdf, "apps/api/src/services/*.ts - business logic")
    bullet(pdf, "apps/api/src/db/schema.ts - database tables")
    bullet(pdf, "apps/api/src/db/migrations/ - SQL migration history")
    bullet(pdf, "apps/api/src/lib/clerkUser.ts - fetch Clerk profile to auto-provision users")
    h2(pdf, "4.3 Worker important locations")
    bullet(pdf, "apps/worker/app/main.py - FastAPI routes")
    bullet(pdf, "apps/worker/app/scrapers/ - job page extraction")
    bullet(pdf, "apps/worker/app/autofill/ - form fillers (demo ATS)")
    bullet(pdf, "apps/worker/app/services/ - scrape + autofill orchestration")
    bullet(pdf, "apps/worker/app/fixtures/ - demo HTML ATS form")
    bullet(pdf, "apps/worker/tests/ - Pytest suite")

    # 5. Pages
    h1(pdf, "5. Website pages (routes users visit)")
    body(pdf, "Defined in apps/web/src/App.tsx")
    kv(pdf, "/", "Landing marketing page")
    kv(pdf, "/about", "About / principles")
    kv(pdf, "/sign-in", "Clerk sign-in -> redirects to /dashboard")
    kv(pdf, "/sign-up", "Clerk sign-up -> redirects to /dashboard")
    kv(pdf, "/dashboard", "Weekly stats + account plan card")
    kv(pdf, "/applications", "Kanban board + add job + Add from job link")
    kv(pdf, "/match-scorer", "Upload/manage resumes + AI match analysis")
    kv(pdf, "/automation", "Coming Soon page (autofill not launched in UI)")
    kv(pdf, "/analytics", "Funnel chart + response metrics")
    kv(pdf, "/settings", "Profile fields for future autofill")
    kv(pdf, "/billing", "Free/Pro plans + Stripe upgrade/manage")

    # 6. API
    h1(pdf, "6. API endpoints (backend)")
    body(pdf, "Base local URL: http://localhost:3001  |  Health: GET /health")
    kv(pdf, "GET /api/me", "Current user; auto-creates DB row if missing")
    kv(pdf, "/api/applications", "Create/list/update/delete applications + events")
    kv(pdf, "/api/resumes", "Resume library CRUD + PDF/DOCX upload parse")
    kv(pdf, "/api/match-score", "Usage + run AI match")
    kv(pdf, "/api/analytics", "Summary + funnel")
    kv(pdf, "/api/profile", "Get/update profile defaults")
    kv(pdf, "/api/billing", "Subscription + Stripe checkout/portal sessions")
    kv(pdf, "/api/automation", "Wishlist-from-URL, runs, demo autofill helpers")
    kv(pdf, "/api/webhooks/clerk", "user.created provisioning backup")
    kv(pdf, "/api/webhooks/stripe", "Subscription plan updates")

    h2(pdf, "Worker endpoints (Python)")
    body(pdf, "Local default: http://localhost:8000")
    kv(pdf, "GET /health", "Worker alive")
    kv(pdf, "POST /scrape", "Open job URL, extract title/company")
    kv(pdf, "POST /autofill", "Fill form / prepare demo review URL")
    kv(pdf, "POST /confirm-submit", "Submit only after explicit confirm")
    kv(pdf, "GET /fixtures/demo-apply.html", "Fake professional ATS form for demos")

    # 7. Database
    h1(pdf, "7. Database tables (Supabase Postgres)")
    body(pdf, "Schema file: apps/api/src/db/schema.ts")
    bullet(pdf, "users - id (Clerk id), email, name, plan (free/pro)")
    bullet(pdf, "profiles - phone, location, LinkedIn, portfolio, work auth")
    bullet(pdf, "resumes - labeled resume versions + parsed text")
    bullet(pdf, "applications - company, role, url, status, notes, source")
    bullet(pdf, "application_events - history (status changes, notes, interviews)")
    bullet(pdf, "automation_runs - scrape/autofill job status + jsonb logs")
    bullet(pdf, "scraped_jobs - raw scraped posting data")
    bullet(pdf, "subscriptions - Stripe customer/subscription linkage")
    bullet(pdf, "match_score_runs - past AI score results (usage metering)")
    body(
        pdf,
        "Important: use the Supabase Session Pooler connection string in DATABASE_URL "
        "(often port 6543 / aws-*-pooler.supabase.com). Direct db.*.supabase.co can be IPv6-only "
        "and fail on many home networks.",
    )

    # 8. Auth flow
    h1(pdf, "8. How login works (auth flow)")
    body(
        pdf,
        "1) User opens /sign-in or /sign-up (Clerk UI).\n"
        "2) Clerk authenticates and stores a session in the browser.\n"
        "3) ProtectedRoute only shows app pages when SignedIn; otherwise RedirectToSignIn.\n"
        "4) When AppShell mounts, useCurrentUser calls GET /api/me with a Bearer token.\n"
        "5) API middleware verifies the JWT with CLERK_SECRET_KEY and sets clerkUserId.\n"
        "6) If no users row exists, API asks Clerk for email/name and provisions free plan.\n"
        "7) Every later API call also sends the Bearer token and is scoped to that user id.",
    )

    # 9. Feature flows
    h1(pdf, "9. Feature walkthroughs")
    h2(pdf, "9.1 Applications Kanban")
    body(
        pdf,
        "Page: /applications. Hook: useApplications. API: /api/applications.\n"
        "User can add manually (company/role/url/notes) or paste a job link.\n"
        "Drag cards across columns; status updates via PATCH. Detail dialog edits notes/deletes.",
    )
    h2(pdf, "9.2 Wishlist from job URL")
    body(
        pdf,
        "On Applications, paste URL -> web calls POST /api/automation/wishlist.\n"
        "API asks worker POST /scrape -> title/company extracted (HTML/JSON-LD, optional AI refine).\n"
        "API inserts application with status wishlist + source automation, then board reloads.",
    )
    h2(pdf, "9.3 Match Scorer")
    body(
        pdf,
        "Page: /match-scorer. Hook: useMatchScorer.\n"
        "Upload PDF/DOCX or paste text -> /api/resumes stores parsed text + label.\n"
        "Paste job description -> POST /api/match-score.\n"
        "Free plan: limited scans/month (shared-types constant). Pro: unlimited.\n"
        "Returns score, missing keywords, suggestions; stores match_score_runs row.",
    )
    h2(pdf, "9.4 Analytics + Dashboard")
    body(
        pdf,
        "Hooks: useAnalytics + useCurrentUser.\n"
        "Dashboard shows applications this week, response rate, account plan.\n"
        "Analytics page adds funnel chart (Wishlist..Rejected) via Recharts.",
    )
    h2(pdf, "9.5 Settings + Billing")
    body(
        pdf,
        "Settings: profile fields used later by autofill.\n"
        "Billing: Free vs Pro. Upgrade creates Stripe Checkout session.\n"
        "Portal manages subscription. Stripe webhook updates plan in DB.\n"
        "Local Stripe uses sk_test keys - no real charges.",
    )
    h2(pdf, "9.6 Automation (Coming Soon in UI)")
    body(
        pdf,
        "Nav shows Soon badge. AutomationPage is ComingSoon component.\n"
        "Backend still has /api/automation and worker autofill/demo paths for future launch.\n"
        "Product message: fill with human review; no blind submit.",
    )

    # 10. Important frontend files
    h1(pdf, "10. Important code files to know")
    h3(pdf, "Web")
    bullet(pdf, "lib/api.ts - fetch wrapper, Bearer token, empty base URL in DEV (Vite proxy)")
    bullet(pdf, "lib/applicationsApi.ts - applications CRUD")
    bullet(pdf, "lib/platformApi.ts - automation/analytics/billing/profile")
    bullet(pdf, "lib/matchScoreApi.ts - resumes + match score calls")
    bullet(pdf, "lib/clerk.ts - publishable key + theme appearance")
    bullet(pdf, "vite.config.ts - proxies /api to localhost:3001 in development")
    h3(pdf, "API")
    bullet(pdf, "middleware/auth.ts - JWT gate")
    bullet(pdf, "routes/me.ts - auto-provision")
    bullet(pdf, "services/matchScore.ts + matchScorer.ts - AI scoring + limits")
    bullet(pdf, "services/billing.ts - Stripe customer/checkout/portal/webhooks")
    bullet(pdf, "services/automation.ts - wishlist + run orchestration")
    h3(pdf, "Shared")
    bullet(pdf, "packages/shared-types - single source of truth for enums/models/API shapes")

    # 11. Env vars
    h1(pdf, "11. Environment variables (.env)")
    body(pdf, "Copy from .env.example. Never commit real secrets.")
    bullet(pdf, "CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY / CLERK_WEBHOOK_SIGNING_SECRET")
    bullet(pdf, "DATABASE_URL (Supabase pooler) + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY")
    bullet(pdf, "REDIS_URL (local docker or Upstash)")
    bullet(pdf, "STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_ID_PRO")
    bullet(pdf, "WEB_APP_URL (http://localhost:5173 locally)")
    bullet(pdf, "OPENAI_API_KEY / OPENAI_MODEL / MOCK_MATCH_SCORER")
    bullet(pdf, "WORKER_INTERNAL_URL (http://localhost:8000 locally)")

    # 12. How to run
    h1(pdf, "12. How to run locally")
    code(
        pdf,
        "# from repo root\n"
        "bun install\n"
        "bun run --filter @jobpilot/api db:migrate   # first time / after schema changes\n"
        "bun dev                                    # web :5173 + api :3001\n"
        "\n"
        "# optional worker\n"
        "cd apps/worker\n"
        "python3 -m venv .venv && source .venv/bin/activate\n"
        "pip install -r requirements.txt\n"
        "uvicorn app.main:app --reload --port 8000",
    )
    body(
        pdf,
        "After changing .env, restart bun dev. If dashboard 500s, check DATABASE_URL "
        "(pooler + sslmode) and API logs (@jobpilot/api#dev in Turbo UI).",
    )

    # 13. Deploy
    h1(pdf, "13. Production deploy (high level)")
    bullet(pdf, "Web: Cloudflare Pages -> https://jobpilot-a7i.pages.dev")
    bullet(pdf, "API: Render Docker (apps/api/Dockerfile)")
    bullet(pdf, "Worker: Render Docker (Python + Chrome)")
    bullet(pdf, "Postgres: Supabase")
    bullet(pdf, "Redis: Upstash")
    bullet(pdf, "Details: docs/DEPLOY.md and docs/KEYS_AND_SETUP.md")
    body(pdf, "Render free tier cold-starts (~30-60s) after idle - normal for demos.")

    # 14. Testing / CI
    h1(pdf, "14. Tests and CI")
    bullet(pdf, "Web/API: Vitest")
    bullet(pdf, "Worker: Pytest + Ruff + Mypy")
    bullet(pdf, "Root: bun run format / format:check (Prettier)")
    bullet(pdf, "GitHub Actions runs these on push/PR")
    body(
        pdf,
        "If CI fails on ruff E501, wrap long lines. If format:check fails, run bun run format from root.",
    )

    # 15. Study path
    h1(pdf, "15. Recommended study path (if you know almost nothing)")
    bullet(pdf, "Day 1: Read this PDF sections 1-5. Click every page on the live site while signed in.")
    bullet(pdf, "Day 2: Open App.tsx and one page file. Match UI to folders.")
    bullet(pdf, "Day 3: Trace login: ProtectedRoute -> useCurrentUser -> /api/me -> users table.")
    bullet(pdf, "Day 4: Trace applications: ApplicationsPage -> useApplications -> /api/applications.")
    bullet(pdf, "Day 5: Trace match scorer end-to-end including resumes table.")
    bullet(pdf, "Day 6: Read schema.ts once. Draw the tables on paper.")
    bullet(pdf, "Day 7: Read billing.ts + Stripe dashboard (test mode).")
    body(
        pdf,
        "You do not need to memorize Selenium or every worker file to explain this project in an interview. "
        "Focus on: monorepo SaaS shape, Clerk auth, Postgres ownership, AI feature, Stripe, and HITL automation design.",
    )

    # 16. Glossary
    h1(pdf, "16. Glossary (simple words)")
    kv(pdf, "Monorepo", "One git repo containing multiple apps/packages")
    kv(pdf, "SPA", "Single Page App - browser app with client-side routes")
    kv(pdf, "JWT", "Signed login token the API verifies")
    kv(pdf, "ORM", "Code that maps tables to typed objects (Drizzle)")
    kv(pdf, "Webhook", "Stripe/Clerk calling your API when something happens")
    kv(pdf, "Kanban", "Columns of cards representing pipeline stages")
    kv(pdf, "HITL", "Human-in-the-loop - person reviews before final action")
    kv(pdf, "Cold start", "Free host waking up after idle; first request slow")
    kv(pdf, "Pooler", "Supabase connection proxy that works better from home networks")

    h1(pdf, "17. What is live vs pending")
    h3(pdf, "Ready now")
    bullet(pdf, "Landing, About, Auth, Dashboard, Applications, Match Scorer, Analytics, Settings, Billing")
    bullet(pdf, "Wishlist from job URL on Applications")
    bullet(pdf, "User auto-provision on first /api/me")
    h3(pdf, "Pending / Coming Soon")
    bullet(pdf, "Full application autofill + submit automation in the product UI")

    pdf.add_page()
    h1(pdf, "18. Closing note")
    body(
        pdf,
        "This application is a full-stack portfolio SaaS: TypeScript React frontend, Bun/Hono API, "
        "Postgres, Clerk, Stripe, AI scoring, and a Python worker. Even if you did not hand-write every line, "
        "you own the product decisions, the repo, the deploy, and the ability to explain the architecture.\n\n"
        "Use this PDF as your map. When interviewing, speak in flows (auth, tracker, AI score, billing) "
        "and point to the folders above. That is enough to sound grounded and honest.",
    )
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 11)
    pdf.multi_cell(0, 6, "Generated for Ayush Dobiwala - JobPilot owner study guide.")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print(path)
