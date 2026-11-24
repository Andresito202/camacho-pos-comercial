# Prueba 5 días — contrato comercial y límites

## Qué está implementado en este portal

| Capacidad | Estado |
|---|---|
| Formulario `/prueba-5-dias` | Implementado |
| Registro CRM `TrialEnrollment` + Lead | Implementado (`POST /v1/crm/trial`) |
| Condiciones visibles (consentimiento datos + términos trial) | Implementado |
| Estado `ACTIVE` con `startsAt` / `expiresAt` (+5 días) | Implementado |
| Expiración automática al consultar estado | Implementado (`GET /v1/crm/trial/:id`) |
| Mensaje de bloqueo al vencer + CTA Contratar | Implementado (`/prueba-5-dias/estado/[id]`) |
| Redirección legacy `/solicitar-demo` → `/prueba-5-dias` | Implementado |

## Qué NO activa este flujo

La prueba **no** provisiona una licencia POS live en Windows/Android.

### Contrato / integración faltante (pos-platform)

Para desbloquear caja real hace falta, en **pos-platform / Central**:

1. **Autoridad GLOBAL** vía `CENTRAL_AUTHORITY_ORIGIN` con session bridge habilitado.
2. Endpoint de aprovisionamiento comercial reachable: `CENTRAL_PROVISIONING_PATH` (default `/v1/commercial/provisioning`) aceptando el outbox de este portal.
3. Emisión de **licencia comercial firmada** / entitlement de caja (tenant/company/branch derivados del contexto autorizado Central — no IDs inventados por el formulario web).
4. Evidencia runtime de que el POS Local Service / desktop reconoce esa licencia.

Hasta que esos contratos existan y se verifiquen, el trial es **CRM comercial** únicamente. El campo `posLicenseProvisioning.activated` permanece `false` y la API documenta el gap en cada respuesta.

## Seguridad del formulario

- Honeypot `website`
- Rate limit 20/min por IP en `/v1/crm/trial`
- Cloudflare Turnstile o reCAPTCHA cuando hay secretos configurados
- En producción, captcha obligatorio si `CAPTCHA_REQUIRED_IN_PRODUCTION=true` (default)

## No claims

- No afirma integración live con pos-platform.
- No afirma cobro ni Factus en la prueba.
- No afirma instalación automática de Windows/Android.
