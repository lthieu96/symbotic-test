# syntax=docker/dockerfile:1

# glibc-based image: uWebSockets.js ships prebuilt glibc binaries (NOT musl/alpine).
# git is needed because uWebSockets.js is a GitHub dependency.
# uWebSockets.js v20.67.0 prebuilt binaries need Node 22/24 AND glibc >= 2.38.
# Debian trixie ships glibc 2.41 (bookworm only has 2.36, which fails to load uWS).
FROM node:22-trixie-slim AS base
# apt-get upgrade pulls the latest Debian security patches (reduces base CVEs).
RUN apt-get update \
  && apt-get upgrade -y \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable
WORKDIR /app

# git is only needed to fetch the uWebSockets.js GitHub dependency during install,
# so it lives in the install stages — never in the final runtime image.
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS prod-deps
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 8080
# Cluster entrypoint: forks WORKERS (or CPU count) uWS workers sharing the port.
CMD ["node", "dist/cluster.js"]
