# Architecture overview — commercial platform

Camacho POS Comercial is an **independent commercial portal**: public website, catalog, cart/checkout, CRM leads, and license/hardware sales orchestration. It is **not** a duplicate of the POS product runtime (`pos-platform`).

## Relationship diagram

```mermaid
flowchart LR
  subgraph Portal["Camacho POS Comercial (this repo)"]
    WEB["apps/web\nNext.js :3000"]
    API["apps/commercial-api\nNestJS :4000"]
    DB[("PostgreSQL 16\ncommercial schema")]
    WEB -->|"REST /v1/*"| API
    API --> DB
  end

  subgraph Central["Central Authority (pos-platform)"]
    CA["Session / licenses /\nGLOBAL admin bridge"]
  end

  subgraph Factus["FACTUS Pay"]
    FP_SB["Sandbox API"]
    FP_PR["Production API\n(credentials required)"]
  end

  API -->|"CENTRAL_AUTHORITY_ORIGIN\nsession bridge (optional)"| CA
  API -->|"provisioning requests\nafter paid orders"| CA
  API -->|"FACTUS_PAY_MODE=SANDBOX"| FP_SB
  API -->|"PRODUCTION only when\nenabled + secrets"| FP_PR
  FP_SB -->|"webhooks"| API
  FP_PR -->|"webhooks"| API
  CA -.->|"official login origin\nfor Iniciar sesión"| WEB
```

## Boundaries

| System | Owns | Does not own |
| --- | --- | --- |
| Portal web + API | Marketing pages, commercial catalog, carts, orders, Factus Pay *collection for portal sales*, leads, support tickets in commercial DB | POS caja, local SQLite, DIAN domain rules, store inventory truth |
| Central Authority | Official operator identity, licenses after hire/provision, GLOBAL admin | Public marketing CMS |
| FACTUS Pay | Payment collection for commercial checkout (adapter) | Product catalog or POS fiscal documents |

## Runtime ports (local / compose)

| Service | Port |
| --- | --- |
| web | 3000 |
| commercial-api | 4000 |
| postgres (compose host map) | **5433** → container 5432 |

## Fail-closed notes

- Production Factus credentials missing → refuse production payment mode.
- WhatsApp `DEV_PLACEHOLDER` → forbidden when `NODE_ENV=production`.
- Web production runtime does not invent sellable catalog when API is down (draft fallback is for development / build only).
