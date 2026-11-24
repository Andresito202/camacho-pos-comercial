# Camacho POS Comercial

Independent commercial platform for Camacho POS Colombia (website + commercial-api).  
**Not** the POS product monorepo (`pos-platform`).

## Packages

| Path | Role |
| --- | --- |
| `apps/web` | Next.js 15 commercial frontend |
| `apps/commercial-api` | Commercial API (sibling workstream) |
| `packages/ui` | Shared accessible UI primitives |

## Quick start (web)

```bash
pnpm install
pnpm dev
```

Requires Node 20+ and pnpm 10. Web defaults to `http://127.0.0.1:3000` and API `http://127.0.0.1:4000`.
