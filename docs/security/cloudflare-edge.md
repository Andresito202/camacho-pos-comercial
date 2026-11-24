# Cloudflare WAF / HTTPS / firewall — configuración documentada (sin contratar)

Este documento describe la **configuración operativa esperada** en Cloudflare para `camachoposcolombia.com` y subdominios. **No** implica que el servicio esté contratado ni verificado en producción. El portal sigue siendo fail-closed sin edge.

## HTTPS / TLS

| Control | Configuración esperada |
|---|---|
| SSL/TLS mode | Full (strict) hacia origen con certificado válido |
| Always Use HTTPS | On |
| Automatic HTTPS Rewrites | On |
| HSTS | Enable + includeSubDomains (alineado con header app en production) |
| Minimum TLS | 1.2 |

## WAF / firewall (reglas recomendadas)

| Regla | Acción |
|---|---|
| OWASP Core Ruleset (managed) | Managed Challenge / Block en sensibilidad media |
| Rate limiting zone | `/v1/crm/*` ≤ 20 req/min/IP; `/v1/checkout` ≤ 30/min; webhooks Factus allowlist |
| Bot Fight / Super Bot Fight | On para rutas públicas de formulario |
| Block countries (opcional) | Solo si el dueño lo autoriza explícitamente |
| Challenge Turnstile | Widget en formularios + verify server-side (ya en API) |

## DNS / proxy

| Host | Proxy | Notas |
|---|---|---|
| apex / www | Proxied (naranja) | HTTPS en edge |
| `api.` (propuesto) | Proxied | Origen solo puerto 443 |
| `staging.` | Proxied + Access opcional | noindex |

## Qué ya cubre la aplicación (sin edge)

- Cabeceras: CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS (prod)
- CSRF Origin + double-submit en CRM mutaciones
- Rate limit durable Postgres + memoria
- Captcha verify + anti-replay
- Cookies carrito SameSite=Lax (+ Secure en HTTPS)

## Login Central — pendiente

El botón «Iniciar sesión» redirige a Central Authority. **Captcha/CSRF del formulario de login viven en pos-platform/Central**, no en este repo. Mientras `CENTRAL_AUTHORITY_ORIGIN` esté vacío:

- Admin fail-closed (`PENDING_CENTRAL_CREDENTIALS`)
- Fixture `ALLOW_ADMIN_TEST_FIXTURE` solo non-prod
- Rate limit de Bearer introspect en `SessionBridgeService`

Documentar en Central: Turnstile en login GLOBAL, lockout, MFA ops — fuera del alcance de este portal.

## Evidencia

Hasta publicar DNS/TLS reales, este archivo es **DOCUMENTED** únicamente. No declarar RUNTIME_VERIFIED de WAF ni de Turnstile en edge.

**Residual (security hardening 2026-11-24):** Turnstile/edge WAF RUNTIME_VERIFIED remains blocked pending field DNS/TLS/WAF + operator captcha secrets. Central live MFA is not simulated by this portal.
