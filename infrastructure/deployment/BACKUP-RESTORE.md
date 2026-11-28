# Backup and restore — commercial Postgres

Scope: the **commercial portal** database only (`camacho_pos_comercial`). This is separate from POS Central / local SQLite.

## What to back up

- PostgreSQL logical dump (schema + data).
- Optional: `SiteSettings`, media object storage (if introduced later — not required for current seed-only media paths).
- Record the git SHA that matches the schema version (`packages/database/prisma/migrations`).

## Backup (logical)

```bash
# Host port 5433 when using docker-compose postgres mapping
export PGPASSWORD='…'   # from secrets store, not git
pg_dump -h 127.0.0.1 -p 5433 -U comercial -d camacho_pos_comercial \
  -Fc -f "camacho_pos_comercial_$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Store dumps in encrypted off-host storage. Retention policy is an ops decision (not defined as code here).

## Restore

1. Stop writers (`commercial-api`) to avoid mid-restore traffic.
2. Create empty DB if needed.
3. Restore:

```bash
export PGPASSWORD='…'
pg_restore -h 127.0.0.1 -p 5433 -U comercial -d camacho_pos_comercial --clean --if-exists \
  camacho_pos_comercial_YYYYMMDDTHHMMSSZ.dump
```

4. Confirm migration history: `pnpm prisma:migrate:deploy` should be a no-op if dump included `_prisma_migrations`.
5. Restart API; hit `GET /health`.
6. Spot-check catalog, open carts (expect stale carts), and payment rows — **do not** replay Factus webhooks blindly.

## Sanity checks after restore

- `SELECT COUNT(*) FROM "Plan";` (and other critical tables) matches expectations.
- No production Factus credentials accidentally restored into a staging env file.
- Staging hosts keep `X-Robots-Tag: noindex` (nginx staging snippet).

## Out of scope

- POS Local Service SQLite backups.
- Central Authority / license ledger backups (owned by the POS platform).
