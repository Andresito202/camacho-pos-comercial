# Portal security hardening — 2026-11-24

Branch: `cursor/portal-security-hardening-c53a` (PR against `feat/commercial-platform-foundation` / PR #1 line).

## Controls shipped

| Control | Change | Evidence target |
|---|---|---|
| Factus webhook auth | Prefer header `x-factus-pay-webhook-key`; query `?key=` kept for provider compat; existing timing-safe compare | Negatives in `security-negatives.test.ts`; happy path header in `commercial-api.test.ts` |
| Rate limit multi-instance | Durable path uses atomic SQL upsert+increment | `rate-limit.service.ts` `assertDurable` |
| Webhook rate limit | Controller uses `assertAsync` | `factus-pay-webhook.controller.ts` |
| SCA in CI | `pnpm audit --prod` report (high+) + fail-closed on critical | `.github/workflows/ci.yml` |

## Residuals (not claimed closed)

| Residual | Risk | Notes |
|---|---|---|
| Query `?key=` still accepted | Key may appear in access logs / referrers | Required until Factus documents header delivery; prefer header in ops |
| High npm advisories (Zod&lt;4.6.6, Prisma transitive effect/deepmerge, Next postcss) | Memory/DoS class on oversized input; transitive tooling | Critical gate green locally; high listed without silent ignore |
| Turnstile / edge WAF RUNTIME_VERIFIED | Bot/DDoS residual | Infra |
| No real Factus charges | Out of scope | Owner unlock |

**No SEC-G PASS claimed.** Physical Windows/M60WL reserved.
