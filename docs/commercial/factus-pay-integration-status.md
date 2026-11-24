# FACTUS Pay — integration status (commercial portal)

Honesty labels: **IMPLEMENTADO** | **PARCIAL** | **BLOQUEADO**

Official provider docs: [pay-developers.factus.com.co](https://pay-developers.factus.com.co/)

## Runtime gates (MOCK vs SANDBOX vs PRODUCTION)

Resolved by `resolveFactusPayGate` in `@camacho-pos-comercial/configuration`:

| Gate | When | Charges money? | Central license provision on simulate? |
| --- | --- | --- | --- |
| **MOCK** | `FACTUS_PAY_MODE=SANDBOX`, no credentials, `NODE_ENV≠production`, sandbox enabled | No — labeled `SANDBOX_MOCK` QR stub | **Never** (`sandbox-simulate-paid` skips outbox) |
| **SANDBOX** | Sandbox mode + email/password (or CLIENT_ID/SECRET aliases) present | Sandbox only | Simulate still skips Central; real webhook may enqueue outbox |
| **PRODUCTION** | `FACTUS_PAY_MODE=PRODUCTION` **and** `FACTUS_PAY_PRODUCTION_ENABLED=true` + credentials + webhook key ≥32 | Yes (real) | N/A for simulate (route disabled) |

**Production charges remain disabled by default** (`FACTUS_PAY_PRODUCTION_ENABLED=false`).

## Env vars (exact)

| Variable | Role | Status |
| --- | --- | --- |
| `FACTUS_PAY_MODE` | `SANDBOX` \| `PRODUCTION` intent | IMPLEMENTADO |
| `FACTUS_PAY_SANDBOX_ENABLED` | Allows MOCK fallback when creds missing | IMPLEMENTADO |
| `FACTUS_PAY_PRODUCTION_ENABLED` | Hard kill-switch for production charges (default `false`) | IMPLEMENTADO |
| `FACTUS_PAY_SANDBOX_BASE_URL` | Default `https://pay-api-sandbox.factus.com.co` | IMPLEMENTADO |
| `FACTUS_PAY_PRODUCTION_BASE_URL` | Default `https://pay-api.factus.com.co` | IMPLEMENTADO |
| `FACTUS_PAY_SANDBOX_EMAIL` / `FACTUS_PAY_SANDBOX_PASSWORD` | Official `/auth` credentials | IMPLEMENTADO (preferred) |
| `FACTUS_PAY_SANDBOX_CLIENT_ID` / `FACTUS_PAY_SANDBOX_CLIENT_SECRET` | Aliases for email/password (historical names) | IMPLEMENTADO |
| `FACTUS_PAY_SANDBOX_WEBHOOK_KEY` | Query `key` for webhook HMAC-style compare (≥32 recommended) | IMPLEMENTADO |
| `FACTUS_PAY_PRODUCTION_EMAIL` / `FACTUS_PAY_PRODUCTION_PASSWORD` | Production `/auth` | IMPLEMENTADO (required when production enabled) |
| `FACTUS_PAY_PRODUCTION_CLIENT_ID` / `FACTUS_PAY_PRODUCTION_CLIENT_SECRET` | Aliases | IMPLEMENTADO |
| `FACTUS_PAY_PRODUCTION_WEBHOOK_KEY` | Production webhook key (≥32 when production) | IMPLEMENTADO |
| `FACTUS_PAY_USE_CENTRAL_GATEWAY` | Proxy collection create to Central (default `false`) | PARCIAL — see Central gateway note |
| `CENTRAL_FACTUS_PAY_GATEWAY_PATH` | Default `/v1/subscriptions/factus-pay/collections` | BLOQUEADO as public API — see below |

## Official endpoints (from Factus docs)

| Action | Method + path | Notes |
| --- | --- | --- |
| Auth | `POST /auth` | Body `{ email, password }` → `{ token }`. Not OAuth client_credentials. Sandbox + production hosts differ. |
| Create collection | `POST /v1/collections` | `{ reference_code, amount, expiration }` — amount in COP pesos; `expiration` in seconds. |
| Get collection | `GET /v1/collections/:referenceCode` | Detail + QR |
| List collections | `GET /v1/collections` | Paginated; optional `status`, `reference_code` |
| Webhook | Prefer `POST <your-url>` + header `x-factus-pay-webhook-key`; query `?key=` still accepted for provider compat | Body `{ data: { reference_code, amount, status: "paid", ... } }`; timing-safe compare |

Commercial adapter path: `apps/commercial-api/src/modules/payments/factus-pay.adapter.ts`  
Webhook path: `POST /v1/webhooks/factus-pay/collections`

## How pos-platform Central subscription Factus gateway works

In **pos-platform** (consult only):

- `prepareSubscriptionFactusPayGateway` builds an **internal** HTTP client to Factus (`POST /auth`, then GET/POST `/v1/collections`).
- Credentials live in a **managed custody file** (`CAMACHO_SUBSCRIPTION_FACTUS_PAY_GATEWAY_V1`), never in browser/argv.
- Used by Central subscription fulfillment / quote flows — **not** a public “create collection for commercial portal” HTTP API.
- Central also has `FACTUS_PAY_COLLECTION_WEBHOOK_PATH = /v1/webhooks/factus-pay/collections` for its own inbox.

Therefore:

| Capability | Status |
| --- | --- |
| Commercial direct Factus call (sandbox/prod) | IMPLEMENTADO (needs credentials) |
| Commercial MOCK gate | IMPLEMENTADO |
| `FACTUS_PAY_USE_CENTRAL_GATEWAY=true` proxy | PARCIAL / BLOQUEADO — Central does not publish that path as a commercial collection API today |
| Production charges | BLOQUEADO until owner enables flag + credentials + webhook |

## Simulate paid ≠ Central provision

`POST /v1/payments/:referenceCode/sandbox-simulate-paid`:

- Allowed only when `NODE_ENV≠production`
- Marks payment/order **PAID** with audit `SANDBOX_SIMULATE_PAID_NO_CENTRAL_PROVISION`
- **Does not** call `ProvisioningService.enqueueForPaidOrder`
- **Does not** `fetch` Central

## Missing credentials checklist

- [ ] Sandbox email + password (or CLIENT_ID/SECRET aliases)
- [ ] Sandbox webhook key (≥32 chars) registered in Factus Pay panel URL
- [ ] Public HTTPS webhook URL pointing at commercial-api
- [ ] Production email + password (only when intentionally enabling charges)
- [ ] `FACTUS_PAY_PRODUCTION_ENABLED=true` (owner authorization required)
- [ ] Production webhook key ≥32
- [ ] Decision: keep `FACTUS_PAY_USE_CENTRAL_GATEWAY=false` until Central publishes a commercial gateway route
