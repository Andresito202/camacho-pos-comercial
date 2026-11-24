# Docker assets

- `Dockerfile.web` — Next.js standalone image
- `Dockerfile.api` — NestJS commercial-api image
- Canonical compose file: **`../../docker-compose.yml`** (repo root)

Host ports: Postgres **5433**, API **4000**, web **3000**. Optional nginx profile publishes **8080**.

```bash
# from repository root
docker compose up -d --build
```
