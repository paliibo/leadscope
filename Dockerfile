# syntax=docker/dockerfile:1

###############################################################################
# Dependencies — cached on the lockfile alone, so app edits don't reinstall.
###############################################################################
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

###############################################################################
# Build — produces the traced standalone server.
###############################################################################
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=1
# Only needed to satisfy env validation at build time; the real values are
# supplied at run time.
ENV AUTH_SECRET=build-time-placeholder-not-a-secret
RUN pnpm build

###############################################################################
# Runtime — non-root, minimal, with a healthcheck.
###############################################################################
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone bundles the server and its traced dependencies; static assets and
# public files are copied alongside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The SQLite file lives on a volume so it survives a container replacement.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
VOLUME /app/data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
