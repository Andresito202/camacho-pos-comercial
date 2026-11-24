# Camacho POS Comercial

Independent **commercial platform** for Camacho POS Colombia: public website, catalog, cart/checkout, CRM, and portal payments (FACTUS Pay adapter).

**This is not a POS duplicate.** Store caja, local SQLite, and DIAN/fiscal domain live in the separate POS product line (`pos-platform`). This repo sells and provisions commercially; it does not reimplement the cashier.

## What it is

| Path | Role |
| --- | --- |
| `apps/web` | Next.js 15 marketing + hire/checkout UI (`:3000`) |
| `apps/commercial-api` | NestJS + Fastify commercial API (`:4000`) |
| `packages/database` | Prisma schema + migrations (PostgreSQL 16) |
| `packages/contracts` | Shared Zod contracts |
| `packages/configuration` | Fail-closed env loading |
| `packages/ui` | Shared UI primitives |
| `infrastructure/` | Docker, nginx proposal, deployment runbooks |

## Architecture (summary)

```text
Browser → web(:3000) → commercial-api(:4000) → PostgreSQL
                              │
                              ├─ optional Central Authority (session / provisioning)
                              └─ FACTUS Pay (sandbox by default; production gated)
```

See `docs/architecture/overview.md` for a Mermaid diagram and boundaries.

## Install

```bash
# Node ≥ 22, pnpm 10
corepack enable
cp .env.example .env   # fill values; never commit secrets
pnpm install
```

Postgres: local instance **or** Compose on host port **5433**:

```bash
docker compose up -d postgres   # requires Docker
# set DATABASE_URL to ...@127.0.0.1:5433/...
pnpm prisma:generate
pnpm db:setup
```

## Run

```bash
pnpm dev:api    # http://127.0.0.1:4000  GET /health
pnpm dev:web    # http://127.0.0.1:3000
```

Full stack (when Docker is available):

```bash
docker compose up -d --build
# optional nginx on :8080
docker compose --profile with-nginx up -d
```

## Environment variables

Root `.env.example` lists API/DB/Factus/Central/WhatsApp vars.  
Web public vars also appear in `apps/web/.env.example` (`NEXT_PUBLIC_*`).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection |
| `PORT` | API listen port (default **4000**) |
| `CENTRAL_AUTHORITY_ORIGIN` | Official Central origin (empty = bridge disabled) |
| `FACTUS_PAY_*` | Sandbox/production Factus Pay settings |
| `WHATSAPP_BUSINESS_NUMBER` | E.164; `DEV_PLACEHOLDER` forbidden in production |
| `NEXT_PUBLIC_API_URL` | Browser → API base |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |

**No real credentials** belong in git.

## Scripts

| Script | Action |
| --- | --- |
| `pnpm typecheck` | TypeScript across packages |
| `pnpm lint` | ESLint / next lint |
| `pnpm test` | Vitest (api + contracts) |
| `pnpm test:e2e` | Playwright happy-path (skips if API down) |
| `pnpm build` / `pnpm build:web` | API packages / Next standalone |
| `pnpm prisma:validate` | Prisma schema validate |
| `pnpm db:setup` | migrate deploy + seed |

## Claim levels

Do not overclaim. Typical ladder: Documented → Implemented → Tested locally → Runtime verified → Caller reachable → End to end → Production.  
CI green is not production evidence. See `docs/commercial/acceptance-status.md`.

## Blockers (honest)

- Production Factus Pay credentials and webhook keys are not shipped here.
- Central Authority origin / session bridge require a live Central deployment.
- DNS/TLS for `camachoposcolombia.com` are **proposals only** (`infrastructure/deployment/DNS-PROPOSAL.md`).
- Docker may be missing on some VMs; compose files are still the canonical definition.
- Paid order → Central provisioning end-to-end is not claimed until observed with real dependencies.

## Docs map

- Architecture: `docs/architecture/`
- Security: `docs/security/`
- Commercial honesty: `docs/commercial/`
- Testing: `docs/testing/strategy.md`
- Deploy: `infrastructure/deployment/`
- Competitive notes (no copying): `docs/competitive-research/`
