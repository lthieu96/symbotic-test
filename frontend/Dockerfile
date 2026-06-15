# syntax=docker/dockerfile:1

# Alpine: the frontend has no native (glibc) dependencies, so the minimal
# musl base sharply cuts OS-level CVEs vs the Debian image.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
# WEBSOCKET_URL is inlined into the client bundle (browser-facing); BACKEND_INTERNAL_URL
# is baked into the rewrite manifest at build time → both must be build args.
ARG WEBSOCKET_URL=ws://localhost:8080
ARG BACKEND_INTERNAL_URL=http://localhost:8080
ENV WEBSOCKET_URL=$WEBSOCKET_URL
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Next standalone output: server.js + only the traced node_modules (no devDeps,
# no build cache) → much smaller runtime image.
FROM base AS runtime
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
