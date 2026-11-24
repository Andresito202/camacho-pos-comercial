# Central license provisioning — status (commercial portal)

Honesty labels: **IMPLEMENTADO** | **PARCIAL** | **BLOQUEADO**

## Model

After a **real** Factus webhook marks an order **PAID**, commercial-api enqueues a `ProvisioningRequest` outbox row (idempotent by `sha256(provision:{orderId})`).

| Condition | Order status | ProvisioningRequest | Label |
| --- | --- | --- | --- |
| Central origin + bridge key; respuesta `QUEUED` | `PROVISIONING` | queda `QUEUED` (no FULFILL) | IMPLEMENTADO — ack de cola ≠ emisión |
| Central origin + bridge key; `ISSUED` + `licenseIds` | `FULFILLED` | `SENT` | PARCIAL — ruta Central en PR #135; requiere tenant/plan + runtime |
| Central origin **missing** / unavailable | stays **`PAID`** | stays **`PENDING`** | **PAID + PENDING_PROVISION** — IMPLEMENTADO |
| Sandbox simulate paid | `PAID` | **no row** / no Central fetch | IMPLEMENTADO (explicit non-provision; **no** evidencia comercial) |
| Worker success sin `licenseIds` | no FULFILL | error / reintento | IMPLEMENTADO (fail-closed) |

## Outbox fields (IMPLEMENTADO)

Model: `ProvisioningRequest` in Prisma

- `idempotencyKey` unique
- `payload` JSON (order, customer email, license units, line snapshots)
- `status`: `PENDING` \| `QUEUED` \| `SENT` \| `ACKNOWLEDGED` \| `FAILED` \| `CANCELLED`
- `attemptCount`, `lastError`, `nextRetryAt`

Enqueue: `ProvisioningService.enqueueForPaidOrder`  
Retry stub: `POST /v1/provisioning/worker/run` (AdminGuard) → `processDue`

## Retry stub (documented)

When Central is unavailable:

1. Request remains `PENDING` with `lastError=PENDING_CENTRAL_CREDENTIALS`
2. `nextRetryAt` advances with capped backoff (`60s * min(60, attempt)`)
3. Order **does not** flip to `FAILED` or `FULFILLED`
4. Operator re-runs worker after setting `CENTRAL_AUTHORITY_ORIGIN`

No silent success. No last-write-wins.

## Target Central HTTP call (PARCIAL / BLOQUEADO)

```http
POST {CENTRAL_AUTHORITY_ORIGIN}{CENTRAL_PROVISIONING_PATH}
Idempotency-Key: <provisioningRequest.idempotencyKey>
Content-Type: application/json

{ orderId, orderNumber, customerEmail, licenseUnits, cajaRule, items[...] }
```

Defaults:

- `CENTRAL_PROVISIONING_PATH=/v1/commercial/provisioning`

**Actualización 2026-11-24:** pos-platform PR #135 publica `POST /v1/commercial/provisioning`. El outbox comercial está listo; la certificación ISSUED+caja sigue **BLOQUEADA** por runtime (Central TLS, tenant/plan, bridge keys, dispositivo), no por ausencia de ruta.

Related Central pieces (pos-platform, consult-only):

- Subscription Factus Pay **internal** gateway (managed custody) for Central subscription fulfillment
- Subscription license fulfillment worker (quotes/payments inside Central) — separate from commercial portal outbox

## Env checklist

| Variable | Purpose | Status |
| --- | --- | --- |
| `CENTRAL_AUTHORITY_ORIGIN` | Base URL for outbox POST | PARCIAL — empty = PAID+PENDING |
| `CENTRAL_PROVISIONING_PATH` | Path appended to origin | IMPLEMENTADO default |
| `CENTRAL_SESSION_BRIDGE_ENABLED` | Admin GLOBAL bridge (not license outbox) | PARCIAL / fail-closed when off |

## Missing credentials / blockers checklist

- [ ] Non-empty `CENTRAL_AUTHORITY_ORIGIN` reachable from commercial-api
- [ ] Central route that accepts commercial provisioning payload with idempotency
- [ ] Auth/mTLS or service credential for that route (not invented here)
- [ ] Agreement on license unit mapping (`ONE_LICENSE_ONE_CAJA`)
- [ ] Owner authorization to treat Central responses as fulfillment evidence
- [ ] End-to-end test with real Central (not claimed here)

## Explicit non-claims

- No claim of PRODUCTION license issuance from the commercial portal.
- No claim that sandbox simulate provisions licenses.
- No claim that CI green equals Central reachable.
