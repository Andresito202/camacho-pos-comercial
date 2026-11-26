# Security controls — commercial portal

## Principles

- **Fail-closed** in production: missing Factus production secrets, placeholder WhatsApp, or disabled production flags block unsafe modes (`packages/configuration`).
- **Tenant / GLOBAL authority** is not granted by client-supplied IDs; admin routes expect Central session bridge when enabled.
- **Secrets** live in environment / secret stores — never in git.

## Control map

| Control | Mechanism | Status |
| --- | --- | --- |
| Env validation | Zod `EnvSchema` at API boot | Implemented |
| CORS | Allowlist site origin + credentials | Implemented |
| Security headers (API) | CSP `default-src 'none'`, nosniff, frame deny, HSTS prod | Implemented (`main.ts`) |
| Security headers (web) | CSP browser, nosniff, frame deny — `apps/web/src/middleware.ts` | Implemented |
| CSRF | Origin allowlist + double-submit cookie/`x-csrf-token` on CRM posts | Implemented |
| Admin guard | Session bridge / fail when Central required | Implemented |
| Admin fixture | Refused when `NODE_ENV=production` | Implemented |
| Admin Bearer throttle | Rate limit on introspect attempts | Implemented |
| Captcha | Turnstile/reCAPTCHA server verify + **replay table** `CaptchaTokenUse` | Implemented |
| Honeypot | `website` field → `BOT_REJECTED` | Implemented |
| Rate limit | Postgres `RateLimitCounter` atomic upsert when `RATE_LIMIT_DURABLE=true` (default) | Implemented |
| Factus webhook auth | `Authorization: Bearer` or `X-Factus-Pay-Webhook-Key` + timing-safe compare; query `?key=` only if `FACTUS_PAY_WEBHOOK_ALLOW_QUERY_KEY` | Implemented |
| CI SCA | `pnpm audit --prod --audit-level=critical` in `.github/workflows/ci.yml` | Implemented (critical gate; high via Dependabot) |
| Trial anti-abuse | `identityKey`, one open trial, 30d cap | Implemented |
| Trial anti-enumeration | Status requires access token; 404 on mismatch; no PII | Implemented |
| Trial activation | Central webhook only; no local simulation | Implemented |
| File/URL validation | `validatePublicImageUrl` / `validateImageUploadMeta` on admin images | Implemented |
| Secure cart cookie | SameSite=Lax + Secure on HTTPS | Implemented |
| Edge WAF/HTTPS | Cloudflare config documented | DOCUMENTED only — see `cloudflare-edge.md` |

### Rate-limit notes

| Route | Limit |
| --- | --- |
| `POST /v1/cart*` | 60–120 / min |
| `POST /v1/checkout` | 30 / min |
| `POST /v1/crm/*` forms | 20 / min |
| `GET /v1/crm/trial/:id` | 30 / min |
| Admin Bearer introspect | 60 / min / token prefix |

Multi-instance: durable Postgres counters. Still recommend Cloudflare rate rules (`cloudflare-edge.md`).

### Captcha

- Invalid / expired provider codes → `CAPTCHA_FAILED` / `CAPTCHA_EXPIRED`
- Reused token hash → `CAPTCHA_REUSED`
- Production without secrets + `CAPTCHA_REQUIRED_IN_PRODUCTION` → `CAPTCHA_NOT_CONFIGURED`

### Central login (pending)

Login UX is a redirect to Central. Captcha/CSRF/MFA for the login form itself are **owned by Central/pos-platform** and are not claimed here. See `cloudflare-edge.md` § Login Central.

## Residuals (not RUNTIME_VERIFIED here)

| Residual | Status |
| --- | --- |
| Cloudflare / edge WAF + HTTPS | **DOCUMENTED only** — see `cloudflare-edge.md`. Do not claim RUNTIME_VERIFIED until DNS/TLS/WAF are live in the field. |
| Turnstile (or reCAPTCHA) production secrets + widget | App verify + replay table exist; **RUNTIME_VERIFIED** blocked until operator keys and edge are configured. |
| Central live MFA (WebAuthn / GLOBAL login) | **Not simulated** in this portal. Login redirects to Central; MFA remains Central-owned. Lab fixture / bridge gates are not product MFA. |

## Explicit non-claims

- No SOC2/ISO from this repo.
- No claim that Cloudflare WAF/TLS is live until operators enable it.
- No simulated POS license activations.
- No claim of Central live MFA coverage from commercial-portal tests alone.
