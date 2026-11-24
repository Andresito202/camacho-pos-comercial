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
| Payment mode gate | Sandbox vs production flags + webhook key length | Implemented |
| Draft catalog | Dev/build only; production runtime fail-closed | Implemented (web) |
| TLS at edge | Nginx / LB (ops) | Documented; not proven by this repo alone |
| DB network | Prefer private network; host 5433 for local compose | Documented |
| Dependency updates | Dependabot npm + github-actions | Documented in `.github/dependabot.yml` |
| Secret scanning | See `secret-scanning.md` | Process note |

## Secret scanning

See [secret-scanning.md](./secret-scanning.md) for CI/process expectations. Do not paste live keys into issues, PR descriptions, or docs.

## Explicit non-claims

- No claim of SOC2 / ISO certification from this repository.
- No claim that production Factus or WhatsApp Business API is connected until credentials and runtime evidence exist.
- DNS/TLS for `camachoposcolombia.com` remain proposals until operators verify them.
