FROM node:22-alpine AS base
# Pin to pnpm 9 to match CI/local; @latest (v11+) enforces minimumReleaseAge and breaks fresh lockfiles.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders for Next.js page-data collection; real values are injected at runtime.
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret
ENV BETTER_AUTH_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
