# Deploy — Camacho POS Comercial

Operational guide for promoting a known git SHA. Does **not** claim that production DNS, TLS, or payment credentials are already live.

## Pre-flight checklist

1. CI green on the exact HEAD (`pnpm typecheck`, lint, test, build, `prisma validate`).
2. `.env` on the target host filled from `.env.example` with **real secrets stored outside git**.
3. `NODE_ENV=production` only when Factus / WhatsApp production rules in `packages/configuration` are satisfied (fail-closed).
4. PostgreSQL 16 reachable; backups verified (see `BACKUP-RESTORE.md`).
5. `CENTRAL_AUTHORITY_ORIGIN` set if session bridge / official login is required; leave empty only when intentionally disabled.

## Suggested host layout

| Service | Container / process | Host port |
| --- | --- | --- |
| Postgres | `postgres:16` | **5433** (or internal only) |
| commercial-api | NestJS | **4000** |
| web | Next.js standalone | **3000** |
| nginx (optional) | reverse proxy | 80/443 |

Images:

```bash
docker build -f infrastructure/docker/Dockerfile.api -t camacho-pos-api:<sha> .
docker build -f infrastructure/docker/Dockerfile.web -t camacho-pos-web:<sha> \
  --build-arg NEXT_PUBLIC_API_URL=https://api.camachoposcolombia.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://camachoposcolombia.com \
  .
```

Subdomains above are **proposals** (see `DNS-PROPOSAL.md`).

## Deploy steps (compose-oriented)

1. Pull SHA on the host (or CI artifact).
2. `docker compose pull` / rebuild images for that SHA.
3. Run migrations: `pnpm prisma:migrate:deploy` (or exec into a one-shot job with `DATABASE_URL`).
4. Start/restart `commercial-api`, then `web`, then optional `nginx`.
5. Smoke: `GET /health`, home page, catalog plans endpoint, checkout path in **sandbox** if Factus sandbox is enabled.
6. Record SHA, timestamp, and operator in your ops log.

## Environment wiring

- Root `.env` drives API + compose.
- Web public vars are **build-time** for Next.js (`NEXT_PUBLIC_*`); rebuild the web image when they change.
- Never enable `FACTUS_PAY_MODE=PRODUCTION` without approved credentials and webhook key length ≥ 32.

## Post-deploy verification (claim levels)

| Check | Claim if observed |
| --- | --- |
| Process listens / health 200 | RUNTIME_VERIFIED (host) |
| Browser hits catalog via nginx | CALLER_REACHABLE (edge) |
| Paid order + Central provision | END_TO_END (only with real evidence) |

Do not mark PRODUCTION readiness from a green CI run alone.
