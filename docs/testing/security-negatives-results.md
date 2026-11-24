# Security negatives — resultados observados

**HEAD de ejecución (local):** pre-push sobre rama `feat/commercial-platform-foundation`  
**Comando:** `pnpm --filter @camacho-pos-comercial/commercial-api run test`  
**Fecha:** 2026-11-24  

## Resumen

| Suite | Resultado |
|---|---|
| `test/admin-fixture.test.ts` | PASS |
| `test/commercial-api.test.ts` | PASS |
| `test/security-negatives.test.ts` | **9/9 PASS** |
| Total | **26/26 PASS** |

## Casos negativos (security-negatives)

| Caso | Código esperado | Observado |
|---|---|---|
| Honeypot relleno | `BOT_REJECTED` 400 | PASS |
| Captcha inválido | `CAPTCHA_FAILED` 400 | PASS |
| Captcha expirado | `CAPTCHA_EXPIRED`/`CAPTCHA_FAILED` 400 | PASS |
| Captcha reutilizado | `CAPTCHA_REUSED` 400 | PASS |
| Trial form → `PENDING_ACTIVATION`, sin reloj | `startsAt/expiresAt` null | PASS |
| Trial duplicado misma identidad | `TRIAL_ALREADY_OPEN` 409 | PASS |
| Estado sin/wrong token | 404 idéntico, sin PII | PASS |
| Activación local sin webhook key | `CENTRAL_TRIAL_WEBHOOK_NOT_CONFIGURED` 503 | PASS |
| Archivo/URL insegura | reject | PASS |

## Notas de alcance

- Turnstile verify usa `verifyFn` inyectado en tests (mismo camino de rechazo/replay que producción).
- WAF Cloudflare: solo documentado (`docs/security/cloudflare-edge.md`) — no RUNTIME_VERIFIED.
- Login Central captcha/CSRF: pendiente en Central/pos-platform; documentado explícitamente.
