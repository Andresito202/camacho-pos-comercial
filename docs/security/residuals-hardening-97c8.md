# Security residuals — portal hardening

Branch work on `feat/commercial-platform-foundation` (PR #1). Fail-closed controls were not weakened.

## Remediated in this pass

| Item | Change |
| --- | --- |
| Factus webhook secret transport | Prefer `Authorization: Bearer` / `X-Factus-Pay-Webhook-Key` + timing-safe compare; query `?key=` only behind `FACTUS_PAY_WEBHOOK_ALLOW_QUERY_KEY` (default false) |
| CI SCA | `pnpm audit --prod --audit-level=critical` in CI (critical fail-closed). No prior high gate — high/moderate remain Dependabot-tracked until an explicit high gate is approved |
| Rate-limit races | Durable path uses single SQL upsert + atomic increment (`RateLimitCounter`) |

## Still residual / not RUNTIME_VERIFIED

| Item | Notes |
| --- | --- |
| Turnstile / edge WAF | App-side verify + docs exist; **RUNTIME_VERIFIED** blocked until Cloudflare DNS/TLS/WAF and production captcha secrets are live (`cloudflare-edge.md`) |
| Central live MFA | GLOBAL WebAuthn / MFA remains Central-owned; **not simulated** here. Lab fixture and bridge test gates are not product MFA |
| SCA high/moderate | Observed under `pnpm audit --prod` (e.g. transitive postcss/zod/prisma tooling). CI does **not** fail on high yet (would break green builds); Dependabot weekly. Do not disable the critical gate. |

See also `docs/security/controls.md` § Residuals.
