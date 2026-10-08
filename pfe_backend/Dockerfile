# syntax=docker/dockerfile:1
# ============================================================
# TalentBridge AI — NestJS backend
# ============================================================
# Multi-stage: deps -> builder -> runner, so the published image carries only
# production node_modules + the compiled dist/, not the toolchain.
#
# No secret is ever referenced here: DATABASE_URL, JWT secrets and SMTP
# credentials all arrive at RUN time from Compose (`environment:`).
# ============================================================

# Node 24 (LTS) — kept in step with the frontend image and with the npm 11
# that generated the lockfiles.
ARG NODE_VERSION=24-alpine


# ── Stage 1: production dependencies ─────────────────────────
FROM node:${NODE_VERSION} AS deps

WORKDIR /app

# Only the manifests, so this layer is re-used as long as dependencies are
# unchanged — editing source code does not reinstall node_modules.
COPY package.json package-lock.json ./

# `npm ci` installs exactly the lockfile, and `--ignore-scripts` blocks
# arbitrary postinstall code from dependencies during the build.
RUN npm ci --omit=dev --ignore-scripts

# Prisma 7 with the driver adapter (@prisma/adapter-pg) generates a WASM
# query compiler, so no platform-specific engine binary is needed — the
# generated client works as-is on Alpine.
COPY prisma ./prisma
RUN npx --yes prisma@7 generate


# ── Stage 2: build (TypeScript -> dist/) ─────────────────────
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json prisma.config.ts ./
COPY src ./src

RUN npm run build


# ── Stage 3: development (hot reload) ────────────────────────
# Used by docker-compose.dev.yml. Source is bind-mounted over /app, so the
# copied files here only serve as a fallback when the mount is absent.
FROM node:${NODE_VERSION} AS development

WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]


# ── Stage 4: production runtime ──────────────────────────────
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# `dumb-init` reaps zombies and forwards SIGTERM so `docker compose down`
# stops Nest gracefully instead of killing it after the 10s timeout.
RUN apk add --no-cache dumb-init

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
# Kept at runtime for `prisma migrate deploy` (run by the `migrate` service).
COPY prisma ./prisma
COPY prisma.config.ts ./

# The `node` user (uid 1000) ships with the official image. Uploaded CVs and
# photos land in /app/uploads, which is a named volume shared with the AI
# service — it must be writable by this user. Everything else stays
# root-owned and read-only to the app, so a compromised request handler
# cannot rewrite dist/ or node_modules.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node

EXPOSE 3000

# Probes the Swagger UI: it is served unconditionally by main.ts, needs no
# auth and touches no database, so it answers 200 exactly when the HTTP server
# is up. (`/api/v1` is NOT usable here — AppController is not registered in
# AppModule, so the global prefix has no root route.)
# Uses Node's built-in fetch — no curl/wget needed in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/docs').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

# `dist/src/main.js`, not `dist/main.js`: prisma.config.ts sits at the project
# root and is part of the TypeScript program, so tsc's inferred rootDir is the
# project root and every emitted file keeps its `src/` prefix. (The repo's
# `npm run start:prod` script still points at the old `dist/main` path and is
# broken for the same reason — unrelated to Docker.)
CMD ["node", "dist/src/main.js"]
