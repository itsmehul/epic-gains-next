# Epic Gains agent notes

- Stack: Next.js App Router, Better Auth, Drizzle/Postgres, pg-workflows, shadcn, TanStack Query.
- Prefer **API routes + TanStack Query** over server actions for client data/mutations.
- Domain features live under `src/features/<name>`; keep infrastructure in `src/infrastructure`.
- Workflows: register in `src/infrastructure/workflows/engine.ts`, expose UI meta in `src/features/workflows/invocable.ts`, add files under `src/workflows`.
- Auth: proxy cookie gate for shell routes; still call `requireApiSession()` in API routes.
- Env: validate with `getEnv()` from `@/shared/env` in server modules.
- Icons: Tabler only (`@tabler/icons-react`).
