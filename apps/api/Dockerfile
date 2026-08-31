# Monorepo Docker build for @jobpilot/api
# Build from repo root:
#   docker build -f apps/api/Dockerfile .

FROM oven/bun:1.2-alpine AS build
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api
# Workspace package.json stubs so bun install matches the lockfile
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json

RUN bun install --frozen-lockfile
RUN bun run --filter @jobpilot/shared-types build

FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app /app

EXPOSE 3001
CMD ["bun", "run", "--filter", "@jobpilot/api", "start"]
