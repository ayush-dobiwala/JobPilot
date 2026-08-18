# @jobpilot/api

Bun + Hono API with Drizzle ORM against Supabase Postgres (no Supabase Auth, no RLS). Clerk JWTs are verified in middleware; every query is scoped by `user_id`.

```bash
# from repo root, with DATABASE_URL in .env
bun install
bun run --filter @jobpilot/api db:migrate
bun run --filter @jobpilot/api dev
```

API listens on `http://localhost:3001` (`PORT` overrides).

### Applications

All routes except `/health` and `/api/webhooks/*` require `Authorization: Bearer <Clerk JWT>`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/applications` | Paginated. `status`, `search`, `page`, `pageSize` |
| POST | `/api/applications` | Create (manual source) |
| PATCH | `/api/applications/:id` | Update; status changes write an event |
| DELETE | `/api/applications/:id` | |
| GET | `/api/applications/:id/events` | |

`GET /api/me` returns the provisioned `users` row for the current Clerk JWT (404 until the webhook runs).
