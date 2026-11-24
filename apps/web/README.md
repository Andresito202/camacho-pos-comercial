# @camacho-pos/web

Next.js 15 commercial frontend for Camacho POS Colombia.

## Run

From the monorepo root:

```bash
pnpm install
pnpm --filter @camacho-pos/web dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Environment

Copy `.env.example` to `.env.local`:

- `NEXT_PUBLIC_API_URL` — default `http://127.0.0.1:4000`
- `NEXT_PUBLIC_SITE_URL` — canonical site (`https://camachoposcolombia.com` in prod; local `http://127.0.0.1:3000`)
- `NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN` — official login origin; if empty, “Iniciar sesión” explains that Central is required
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — fallback WhatsApp E.164 digits

When commercial-api is unreachable, **development** serves labeled DRAFT preview data. Production fails closed instead of inventing catalog content.

## API contract (aligned with commercial-api)

| Web need | API route |
| --- | --- |
| Settings | `GET /v1/content/settings` |
| Plans | `GET /v1/catalog/plans` |
| Products / kits | `GET /v1/catalog/products`, `GET /v1/catalog/kits` |
| FAQ / blog | `GET /v1/content/faqs`, `GET /v1/content/blog` |
| Coverage | `GET /v1/coverage/zones` |
| WhatsApp | `POST /v1/whatsapp/catalog-message` |
| Demo / contact | `POST /v1/crm/demo`, `POST /v1/crm/contact` |
| Cart | `POST /v1/cart`, `POST /v1/cart/:sessionToken/items` |
| Checkout / payment status | `POST /v1/checkout` (`cartSessionToken` + `idempotencyKey`), `GET /v1/payments/:referenceCode` |
| Admin (GLOBAL) | `GET /v1/admin/catalog/plans|kits` (+ stubs: pedidos/pagos/clientes/contenidos/promociones/ajustes) |

In non-production, `GET /v1/catalog/plans|products|kits` and `GET /v1/coverage/zones` include DRAFT for preview. Purchase paths still reject unpublished prices.

When commercial-api is unreachable, **development** (and production *build*) may use labeled DRAFT preview. Production *runtime* fails closed without inventing sellable catalog.
