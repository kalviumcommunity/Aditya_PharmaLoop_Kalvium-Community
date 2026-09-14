# =============================================================================
# PharmaLoop — Production Dockerfile
# =============================================================================
#
# Base image: node:22-alpine
# Reason: Prisma 7.9.1 requires ^20.19 || ^22.12 || >=24.0
#         Next.js 16.3.2 requires >=20.9.0
#         Node 22 LTS (Alpine) satisfies both constraints.
#
# Architecture: multi-stage
#   1. deps    — install ALL npm dependencies (locked by package-lock.json)
#   2. builder — generate Prisma client, run Next.js production build
#   3. runner  — copy standalone output, run as non-root user
#
# Secrets are NEVER copied into the image.
# Supabase PostgreSQL remains external; DATABASE_URL injected at runtime.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: deps — install dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

# libc6-compat is recommended for Alpine compatibility with some native addons
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy lockfile and manifests first for optimal layer caching
COPY package.json package-lock.json ./

# Reproducible install — uses exact versions from package-lock.json
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: builder — Prisma generate + Next.js production build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Inherit node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files required for build
COPY . .

# Generate Prisma client from schema.
# prisma generate only reads schema.prisma - no DB connection required.
# Prisma 7 writes to app/generated/prisma (client.ts is the entrypoint; no index.ts).
# Host-generated files are excluded via .dockerignore so this is always a clean generate.
RUN npx prisma generate \
 && test -f app/generated/prisma/client.ts \
 && echo "Prisma client generated at app/generated/prisma/client.ts"

# Build Next.js for production (output: "standalone" in next.config.ts)
# NODE_ENV=production is set so Next.js applies all production optimisations.
# No runtime secrets are needed for the build itself.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Next.js evaluates route modules while collecting build metadata. Prisma's
# adapter is constructed during that phase, but never connects until a query.
# Use a deliberately non-routable, non-secret build placeholder; Render's
# runtime DATABASE_URL overrides it and is never baked into the image.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/pharmaloop_build

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runner - minimal production image
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Create a dedicated non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Bind on all interfaces so the container is reachable
ENV HOSTNAME=0.0.0.0

# Default port — override at runtime with -e PORT=<n>
ENV PORT=3000

# --- Static assets ---
# public/ is served directly by the standalone server
COPY --from=builder /app/public ./public

# --- Next.js standalone output ---
# .next/standalone contains server.js and a minimal node_modules shim
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# --- Static build artefacts (CSS, JS, images) ---
# Must be placed at .next/static relative to server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# --- Generated Prisma client ---
# Generated inside the builder (not copied from host). Entrypoint is client.ts.
# Runtime needs these files for any server code that imports the Prisma client.
COPY --from=builder --chown=nextjs:nodejs /app/app/generated/prisma ./app/generated/prisma

USER nextjs

EXPOSE 3000

# Standalone server entry point.
# Honours PORT and HOSTNAME environment variables.
CMD ["node", "server.js"]
