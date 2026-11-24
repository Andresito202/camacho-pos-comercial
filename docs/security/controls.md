# Security controls — commercial portal

## Principles

- **Fail-closed** in production: missing Factus production secrets, placeholder WhatsApp, or disabled production flags block unsafe modes (`packages/configuration`).
- **Tenant / GLOBAL authority** is not granted by client-supplied IDs; admin routes expect Central session bridge when enabled.
- **Secrets** live in environment / secret stores — never in git. `.env` is gitignored; `.env.example` has empty placeholders only.

## Control map

| Control | Mechanism | Status |
| --- | --- | --- |
| Env validation | Zod `EnvSchema` at API boot | Implemented |
| CORS | Allowlist site origin + local web | Implemented |
| Admin guard | Session bridge / fail when Central required | Implemented (bridge optional via flag) |
| Admin fixture | `ALLOW_ADMIN_TEST_FIXTURE` refused when `NODE_ENV=production` | Implemented |
| Payment mode gate | MOCK / SANDBOX / PRODUCTION + webhook key length; production charges default off | Implemented |
| Draft catalog | Dev/build only; production runtime fail-closed | Implemented (web) |
| Rate limit (sensitive routes) | In-memory `RateLimitService` on cart, checkout, Factus webhook, sandbox-simulate, **CRM public posts** | Partial — single-process only; not edge/WAF |
| Honeypot | Field `website` on contact / hire / trial forms; non-empty → `BOT_REJECTED` | Implemented |
| Captcha | Cloudflare Turnstile **or** Google reCAPTCHA via `CaptchaService`; public config at `GET /v1/crm/captcha-config` | Implemented (keys optional in non-prod; required in production when `CAPTCHA_REQUIRED_IN_PRODUCTION=true`) |
| Anti-spam CRM | Rate limit 20/min/IP + honeypot + captcha on `/v1/crm/contact`, `/trial`, `/leads`, `/demo` | Implemented |
| TLS at edge | Nginx / LB (ops) | Documented; not proven by this repo alone |
| DB network | Prefer private network; host 5433 for local compose | Documented |
| Dependency updates | Dependabot npm + github-actions | Documented in `.github/dependabot.yml` |
| Secret scanning | See `secret-scanning.md` | Process note |

### Rate-limit notes

Applied limits (per IP, sliding window, process-local):

| Route | Limit |
| --- | --- |
| `POST /v1/cart` | 60 / min |
| `POST /v1/cart/:token/items` | 120 / min |
| `POST /v1/checkout` | 30 / min |
| `POST /v1/webhooks/factus-pay/collections` | 120 / min |
| `POST /v1/payments/:ref/sandbox-simulate-paid` | 20 / min |
| `POST /v1/crm/contact` | 20 / min |
| `POST /v1/crm/trial` | 20 / min |
| `POST /v1/crm/leads` | 20 / min |
| `POST /v1/crm/demo` | 20 / min |
| `GET /v1/crm/trial/:id` | 60 / min |

Honest gap: multi-instance deployments need Redis/edge throttling; this repo does not claim that.

### Captcha env

```text
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
CAPTCHA_REQUIRED_IN_PRODUCTION=true
```

Prefer Turnstile when both are set. Without secrets, non-production relies on honeypot + rate limit; production fails closed if captcha is required.

### Admin hardening (evidence)

| Control | Evidence |
| --- | --- |
| No client-granted GLOBAL role | `AdminGuard` + `SessionBridgeService` introspect Central; fixture header only when `ALLOW_ADMIN_TEST_FIXTURE=1` **and** `NODE_ENV!==production` |
| Production refuses fixture | `EnvSchema.superRefine` |
| Catalog price writes | `canManageCatalogPrices` requires `SUPERADMIN_GLOBAL` authenticated session |
| Public CRM cannot hit admin | Separate Nest modules + guard on `/v1/admin/*` |

## Secret scanning

See [secret-scanning.md](./secret-scanning.md) for CI/process expectations. Do not paste live keys into issues, PR descriptions, or docs.

## Explicit non-claims

- No claim of SOC2 / ISO certification from this repository.
- No claim that production Factus or WhatsApp Business API is connected until credentials and runtime evidence exist.
- No claim that Turnstile/reCAPTCHA is live until site/secret keys are provisioned.
- DNS/TLS for `camachoposcolombia.com` remain proposals until operators verify them.
