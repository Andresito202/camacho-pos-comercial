# Commercial platform smoke evidence

Captured on branch `feat/commercial-platform-foundation` at **2026-11-24T03:15:40Z** (UTC).

Environment:

- `DATABASE_URL=postgresql://comercial:***@127.0.0.1:5432/camacho_pos_comercial?schema=public`
- commercial-api on `http://127.0.0.1:4000` (`NODE_ENV=development`)
- web (Next.js) on `http://127.0.0.1:3000`
- migrate deploy + seed applied before smoke (`pnpm db:setup`)

## How to start (local)

```bash
export DATABASE_URL='postgresql://comercial:***@127.0.0.1:5432/camacho_pos_comercial?schema=public'
export PORT=4000
pnpm db:setup
pnpm --filter @camacho-pos-comercial/commercial-api start:dev
# other terminal
export NEXT_PUBLIC_API_URL='http://127.0.0.1:4000'
pnpm --filter @camacho-pos/web dev
```

At capture time both processes were left running (API PID listening on `:4000`; Next on `:3000`).

## Curl smoke results

| Check | Command (summary) | Result | Verdict |
| --- | --- | --- | --- |
| Health | `GET /health` | `{"status":"ok","service":"commercial-api"}` http 200 | **PASS** |
| Catalog plans (DRAFT in development) | `GET /v1/catalog/plans` | 4 plans, all `publicationStatus=DRAFT` (`esencial`, `profesional`, `empresarial`, `perpetua`) http 200 | **PASS** |
| Cart price tamper | Publish `esencial` MONTHLY temporarily → `POST /v1/cart` → `POST /v1/cart/:token/items` with `expectedUnitAmountCents = amount+1` → restore DRAFT | `{"code":"PRICE_TAMPERING_REJECTED",...}` http 400 | **PASS** |
| Checkout client totals | Valid cart add then `POST /v1/checkout` with `totalCents: 1` | `{"code":"CLIENT_TOTALS_REJECTED",...}` http 400 | **PASS** |
| WhatsApp message builder | `POST /v1/whatsapp/catalog-message` `{"planSlug":"esencial","utmSource":"smoke"}` | url + text returned, `phoneMarkedDevPlaceholder: true` http 201 | **PASS** |
| Webhook idempotency | `POST /v1/webhooks/factus-pay/collections?key=...` twice for same payload | first `{"result":"STORED"}` http 201; second `{"result":"DUPLICATE"}` http 201 | **PASS** |
| CRM contact | `POST /v1/crm/contact` | `{id,status:"NEW"}` http 201 | **PASS** |
| Admin catalog (no Central) | `GET /v1/admin/catalog/plans` | `PENDING_CENTRAL_CREDENTIALS` http 401 | **PASS** (fail-closed) |
| Web home | `GET http://127.0.0.1:3000/` | http 200 | **PASS** |

### Exact outputs (excerpt)

```text
## health
{"status":"ok","service":"commercial-api"}
http:200

## catalog plans (DRAFT expected)
count 4
statuses ['DRAFT']
slugs ['esencial', 'profesional', 'empresarial', 'perpetua']
http:200

## cart tamper
{"code":"PRICE_TAMPERING_REJECTED","message":"Client-supplied unit amount does not match server price."}
http:400

## checkout client totals
{"code":"CLIENT_TOTALS_REJECTED","message":"Client-supplied totals are rejected; server is price authority."}
http:400

## whatsapp
{"url":"https://wa.me/573000000000?text=...","text":"Hola, me interesa Camacho POS. Plan: esencial ref:smoke","phoneMarkedDevPlaceholder":true,...}
http:201

## webhook first
{"result":"STORED"}
http:201

## webhook second
{"result":"DUPLICATE"}
http:201
```

Notes:

- Seed catalog remains DRAFT after smoke; purchase paths still reject unpublished prices (`DRAFT_PRICE_NOT_PURCHASABLE`). Tamper checks temporarily published `esencial` MONTHLY then restored DRAFT.
- WhatsApp number is the configured DEV placeholder — expected in development.

## `pnpm test`

Command: `pnpm test`

```text
packages/contracts — 4 tests passed
apps/commercial-api — 6 tests passed
```

Verdict: **PASS**

## `pnpm typecheck`

Command: `pnpm typecheck`

```text
packages/configuration Done
packages/contracts Done
packages/database Done
packages/ui Done
apps/web Done
apps/commercial-api Done
```

Verdict: **PASS** (after fixing `apps/commercial-api/tsconfig.json` so `test/**/*.ts` is not under a `src`-only `rootDir`)

## Alignments fixed in this pass

1. Public catalog/coverage include DRAFT in non-production (purchase still PUBLISHED-only).
2. Web checkout uses `POST /v1/cart` → `POST /v1/cart/:sessionToken/items` → `POST /v1/checkout` with `cartSessionToken` + `idempotencyKey` (no client totals).
3. Web cart items carry `planPriceId` / `productVariantId` / `kitId` + `priceVersion`.
4. Payment status lookup uses `GET /v1/payments/:referenceCode`.
5. Admin stubs: `pedidos`, `pagos`, `clientes`, `contenidos`, `promociones`, `ajustes` (GLOBAL-guarded empty lists).
6. Contract parse failures / `CLIENT_TOTALS_REJECTED` mapped to HTTP 400.
7. API default/local PORT aligned to **4000** (matches web `NEXT_PUBLIC_API_URL`).
