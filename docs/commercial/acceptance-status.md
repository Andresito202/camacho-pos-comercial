# Acceptance status — commercial platform foundation

Claim ladder used here (honest, non-inferred):

| Level | Meaning |
| --- | --- |
| Documented | Spec/docs exist |
| Implemented | Code present in this repo |
| Tested locally | Automated or manual test observed in a developer environment |
| Runtime verified | Process started and health/behavior observed |
| Caller reachable | External HTTP client hit real handler |
| End to end | Full user journey with real dependencies |
| Production | Live customer environment evidence |

## Capability acceptance

| Area | Status | Evidence / notes |
| --- | --- | --- |
| Monorepo layout (web, api, packages) | Implemented | `apps/*`, `packages/*` |
| Prisma commercial schema + init migration | Implemented | `packages/database/prisma` |
| Catalog / cart / checkout / CRM API modules | Implemented | `apps/commercial-api/src/modules` |
| Factus Pay adapter (sandbox-aware) | Implemented | Production path gated fail-closed |
| Next.js marketing + hire flows | Implemented | `apps/web` |
| Draft fallback (dev/build only) | Implemented | Production runtime fail-closed |
| Dockerfiles + compose (5433/4000/3000) | Documented + Implemented (files) | Docker runtime **not** assumed on every VM |
| Nginx + DNS proposals | Documented | DNS **not** claimed configured |
| Unit/API vitest suite | Implemented | Run via `pnpm test` when DB available |
| Playwright happy-path skeleton | Implemented | Skips with clear message if API down |
| CI workflow | Documented + Implemented (YAML) | Requires GitHub Actions when remote exists |
| Paid order → Central provision E2E | Not end-to-end | Needs Central + credentials |
| Production Factus Pay | Not production | Credentials / approval pending |
| Live DNS/TLS camachoposcolombia.com | Documented proposal only | See `infrastructure/deployment/DNS-PROPOSAL.md` |

When recording a higher level, attach command output, SHA, and environment — never promote by inference.
