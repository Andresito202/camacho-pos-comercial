# Testing strategy — commercial portal

## Pyramid

| Layer | Tool | Location | When |
| --- | --- | --- | --- |
| Contracts / Zod | Vitest | `packages/contracts` | Every PR |
| API critical paths | Vitest + Nest | `apps/commercial-api/test` | Every PR when Postgres available |
| Web typecheck | `tsc` | `apps/web` | Every PR |
| Lint | ESLint / `next lint` | web + api | Every PR |
| Build | `next build`, `tsc` api | CI | Every PR |
| Prisma | `prisma validate` | `packages/database` | Every PR |
| E2E smoke | Playwright | `apps/web/e2e` | CI optional / local; **skips** if API down |

## Local commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm prisma:validate
pnpm build
pnpm build:web
pnpm test:e2e
```

## Database dependency

API integration tests expect PostgreSQL reachable at `DATABASE_URL` (compose host port **5433** or local 5432). If the database is missing, report the failure honestly — do not delete tests to fake green.

## Playwright policy

Happy-path specs should:

1. Probe `GET {API}/health` (or catalog).
2. If unreachable, **skip** with an explicit message (not a silent pass).
3. Never invent paid Factus production flows in CI without secrets.

## What we do not claim

- Green CI ≠ production readiness.
- Skipped e2e ≠ end-to-end verified.
- Lint/typecheck alone ≠ runtime verified.
