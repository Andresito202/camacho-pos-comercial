# Security negatives — resultados observados

**Comando:** `pnpm --filter @camacho-pos-comercial/commercial-api run test`  
**Fecha:** 2026-11-24 (post auditoría final)

## Resumen

| Suite | Resultado |
|---|---|
| `test/admin-fixture.test.ts` | PASS |
| `test/commercial-api.test.ts` | PASS |
| `test/security-negatives.test.ts` | **13/13 PASS** |
| Total | **30/30 PASS** |

## Casos negativos

| Caso | Observado |
|---|---|
| Honeypot | `BOT_REJECTED` 400 |
| Captcha inválido / expirado / reutilizado | 400 |
| Captcha race paralelo mismo token | 1 OK + 1 `CAPTCHA_REUSED` |
| Trial `PENDING_ACTIVATION` sin reloj | PASS |
| Trial duplicado / race identidad | 409 / openCount=1 |
| Estado sin header / query ignorado | 404; sin PII |
| Activación sin webhook key | 503 |
| expire-due sin auth | 403/503 |
| Support ticket IDOR sin token | 404 |
| Archivo/URL insegura | reject |

Auditoría: `docs/security/final-audit-fa6a9ed.md`  
Contratos pos-platform: `docs/commercial/pos-platform-contracts-required.md`
