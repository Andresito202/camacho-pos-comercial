# Install — Camacho POS Comercial

This repository is the **commercial portal** (website + commercial-api). It is **not** a copy of the POS product monorepo (`pos-platform`).

## Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | ≥ 22 |
| pnpm | 10.x (Corepack: `corepack enable`) |
| PostgreSQL | 16 (local or Docker) |
| Docker Engine + Compose | optional; required only for the container stack |

Docker may be unavailable in some VMs. You can still develop with a host Postgres and `pnpm` scripts.

## 1. Clone and install

```bash
git clone <this-repo-url> camacho-pos-comercial
cd camacho-pos-comercial
cp .env.example .env
# edit .env — never commit secrets
pnpm install
```

## 2. Database

**Host Postgres (default local ports):** set `DATABASE_URL` in `.env`.

**Compose Postgres (recommended host port 5433):**

```bash
docker compose up -d postgres
# DATABASE_URL should use port 5433 on the host, e.g.
# postgresql://comercial:comercial_dev@127.0.0.1:5433/camacho_pos_comercial?schema=public
```

Apply schema and seed:

```bash
pnpm prisma:generate
pnpm db:setup
```

## 3. Run locally (without Docker for apps)

```bash
# terminal A
pnpm dev:api

# terminal B
pnpm dev:web
```

- Web: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:4000` (`GET /health`)

## 4. Full Docker stack (when Docker is available)

```bash
docker compose up -d --build
# then migrate + seed against the API container or host URL on :5433
```

Optional nginx profile (host `8080`):

```bash
docker compose --profile with-nginx up -d --build
```

## Blockers / honesty

- Factus Pay production credentials and Central Authority origin are **not** shipped in this repo.
- WhatsApp number in `.env.example` is a **DEV placeholder**.
- DNS / TLS for `camachoposcolombia.com` are **proposals** — see `DNS-PROPOSAL.md`. They are not claimed as configured by these files alone.
