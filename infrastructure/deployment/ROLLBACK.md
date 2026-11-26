# Rollback — Camacho POS Comercial

Goal: return edge traffic to a previously known-good **application SHA** and, if required, a matching **database** backup.

## Application-only rollback (preferred)

Use when the schema is forward-compatible or unchanged.

1. Identify last good image tags / git SHA from the deploy log.
2. Redeploy previous `camacho-pos-api:<sha>` and `camacho-pos-web:<sha>`.
3. Restart nginx if used so upstreams refresh.
4. Verify `GET /health` and a public page load.
5. Record rollback reason and SHA pair.

```bash
# example with compose + pinned tags in an override file
docker compose up -d commercial-api web
```

## Schema / data rollback

Prisma migrations are forward-only in normal operation. If a migration must be undone:

1. Prefer restore from a pre-deploy dump (`BACKUP-RESTORE.md`) onto a **new** database and switch `DATABASE_URL`.
2. Do not hand-edit `_prisma_migrations` without an explicit ops decision.
3. Re-run API against the restored DB; confirm health and catalog.

## Payment / provisioning caution

- In-flight Factus Pay attempts may reference order IDs that exist only on the newer SHA.
- After rollback, inspect `Payment` / `PaymentAttempt` / `ProvisioningRequest` for stuck states; resolve manually with audit notes — no silent last-write-wins.
- Sandbox vs production mode must match the environment; never point staging at production Factus keys during a rollback drill.

## Decision record

After any rollback, document:

- From SHA → to SHA
- Whether DB restore was used
- Customer-visible impact window
- Follow-up fix ticket
