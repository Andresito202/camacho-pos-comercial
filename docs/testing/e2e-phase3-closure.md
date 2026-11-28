# E2E cierre pendientes — evidencia observada

Fecha (UTC): 2026-11-24  
Rama: `feat/commercial-platform-foundation`  
API: `http://127.0.0.1:4000` con `ALLOW_ADMIN_TEST_FIXTURE=1` (no-prod)

## Reflejo admin → público

| Prueba | Resultado observado |
|---|---|
| PATCH plan-price (+17 COP) + `publish:true` | Público `/v1/catalog/plans` vio `amountCents` actualizado y `PUBLISHED` |
| Restore precio original | Confirmado |
| POST producto PUBLISHED + imagen + variante publish 251000 | `/v1/catalog/products?includeDraft=0` devolvió producto con 1 imagen y precio 251000 |

## Contratación / WhatsApp / carrito / checkout

| Flujo | Resultado observado |
|---|---|
| `POST /v1/whatsapp/catalog-message` | **201** — `wa.me` URL + texto con plan/modalidad/precio |
| `POST /v1/cart` + item `planPriceId` + `expectedPriceVersion` | **201** — totals server `79900` |
| `POST /v1/checkout` | **201** — order `PENDING_PAYMENT`, payment `SANDBOX_MOCK` (sin cobro real) |
| `POST /v1/crm/leads` (contratación) | **201** — lead `NEW` |

## Kits / pedidos (vitest)

`admin-fixture.test.ts`: kit create + replace items + public reflect; ship/deliver/cancel; `FACTUS_REFUND_UNSUPPORTED` — **PASS** (suite completa 17 tests con `commercial-api.test.ts`).

## No acreditado aquí

- Login Central GLOBAL live
- Cobro FACTUS PRODUCTION
- Reembolso Factus (rechazado a propósito)
- Capturas UI de este cierre (ver `screenshots-phase3/` históricas + LH)
