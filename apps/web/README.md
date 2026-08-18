# @jobpilot/web

React 18 + Vite + TypeScript, Tailwind, shadcn/ui, Clerk.

```bash
# from repo root, with Clerk keys in .env
bun run --filter @jobpilot/api dev
bun run --filter @jobpilot/web dev
```

Web: `http://localhost:5173` (proxies `/api` to the API on `:3001`).

### Clerk setup

1. Create a Clerk application.
2. Copy the **publishable key** into `CLERK_PUBLISHABLE_KEY` and the **secret key** into `CLERK_SECRET_KEY`.
3. Paths: sign-in `/sign-in`, sign-up `/sign-up`, after auth `/dashboard`.
4. Webhook: `user.created` → `https://<public-url>/api/webhooks/clerk` with signing secret in `CLERK_WEBHOOK_SIGNING_SECRET`.

Local webhooks need a tunnel (Cloudflare Tunnel / ngrok) to your API, because Clerk cannot POST to `localhost`.

After sign-up, the dashboard polls `GET /api/me` until the webhook inserts your `users` row.
