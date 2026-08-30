# FROM oven/bun:1.2-alpine AS deps
# Note: pin major; Render/Fly rebuild on every push to main.

FROM oven/bun:1.2-alpine AS build
WORKDIR /app

# Monorepo context: build from repo root with:
#   docker build -f apps/api/Dockerfile .
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN bun install --frozen-lockfile
RUN bun run --filter @jobpilot/shared-types build

FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app /app

EXPOSE 3001
CMD ["bun", "run", "--filter", "@jobpilot/api", "start"]
