# Auditoría final de seguridad — post-fixes (rama PR #1)

Base auditada: `fa6a9ed` + fixes de vulnerabilidades demostradas en este commit.

## Hallazgos demostrados y remediación

| ID | Severidad | Hallazgo | Fix |
|---|---|---|---|
| A1 | Medium | TOCTOU enrollment trial (paralelo) | Advisory lock + índice único parcial open identity |
| A2 | Medium | Token trial en query URL | Solo header `X-Trial-Access-Token` + sessionStorage |
| A3 | Medium | Activación Central no atómica | `updateMany` condicional `PENDING_ACTIVATION` |
| A4 | Medium | Captcha replay paralelo | Claim `CaptchaTokenUse` insert-first |
| A5 | Medium | IDOR `GET /v1/support/tickets/:id` | `accessTokenHash` + header; sin email en respuesta |
| A6 | Low | `expire-due` sin auth | Requiere `X-Central-Trial-Webhook-Key` |
| A7 | Low | `sandbox-simulate` devolvía 200 en prod path | `ForbiddenException` 403 |
| A8 | Low | `ALLOW_DRAFT_BUILD_FALLBACK` en runtime prod | Removido; solo `NEXT_PHASE` build |
| A9 | Low | `verifyFn` injectable | Ignorado si `NODE_ENV=production` |

## Áreas sin defecto demostrado (re-check)

- Pagos: totales server-side; Factus webhook key timing-safe + amount match + idempotencia
- Admin: fixture bloqueado por EnvSchema + `isProduction`
- SQLi: Prisma parametrizado; advisory lock usa parámetro bound
- SSRF: fetch a URLs fijas/env (Turnstile, reCAPTCHA, Central origin)
- CSRF CRM: Origin allowlist + double-submit (NODE_ENV≠test)
- XSS público: blog renderiza texto partido, no HTML crudo; JSON-LD escapa vía `JSON.stringify`

## Repo público — secretos / PII

| Check | Resultado |
|---|---|
| `.env` tracked | No (gitignore) |
| Patrones `sk_live_`, `AKIA`, `BEGIN PRIVATE KEY`, `ghp_` | No matches en fuentes |
| Credenciales | Solo placeholders `comercial_dev` en compose/CI/docs |
| PII real de clientes | No encontrada en árbol tracked |

## Contratos posteriores pos-platform

Ver `docs/commercial/pos-platform-contracts-required.md` (login GLOBAL, trial 120h, bloqueo, provisioning).
