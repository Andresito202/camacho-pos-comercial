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

## API contract (expected)

Public: `/v1/public/settings|plans|equipment|promotions|coverage|solutions|faq|features|blog` (+ slug detail routes), `POST /v1/public/cart/quote`, `checkout`, `whatsapp/build`, `demo-requests`, `contact`.

Admin: `GET /v1/admin/session` and `/v1/admin/*` with `Authorization: Bearer` and GLOBAL role.
