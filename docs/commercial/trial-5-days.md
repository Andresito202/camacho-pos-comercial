# Prueba 5 días — contrato comercial y límites

## Ciclo de vida (normativo)

| Estado | Significado |
|---|---|
| `PENDING_ACTIVATION` | Formulario CRM recibido. **El reloj NO corre.** |
| `ACTIVE` | Central confirmó licencia POS (`activationSource=CENTRAL_LICENSE_CONFIRMED`). Reloj 5 días. |
| `EXPIRED` / `BLOCKED` | Vencimiento durable en Postgres; CTA contratar. Revocación en caja = contrato Central. |

## Qué está implementado

| Capacidad | Estado |
|---|---|
| Formulario `/prueba-5-dias` | Implementado |
| Registro `TrialEnrollment` + Lead | `POST /v1/crm/trial` → `PENDING_ACTIVATION` |
| Anti-repetición por `identityKey` (email\|phone) | Implementado |
| Token de acceso opaco para estado (anti-enumeración) | Implementado (`?token=`) |
| Sin PII en respuesta pública de estado | Implementado |
| Activación solo vía Central webhook | `POST /v1/crm/trial/:id/activate-from-central` + `CENTRAL_TRIAL_WEBHOOK_KEY` (≥32) |
| Expiración durable | `POST /v1/crm/trial/expire-due` + chequeo en lectura |
| Condiciones / consentimientos visibles | Implementado |

## Qué NO hace este portal

- **No** inicia el trial al enviar el formulario.
- **No** simula activaciones locales ni “fixture ACTIVE”.
- **No** revoca licencia en Windows/Android por sí solo.

### Contrato faltante en pos-platform / Central

1. Emisión de licencia trial firmada (GLOBAL) y notificación al portal con `centralLicenseRef`.
2. Webhook autenticado hacia `POST /v1/crm/trial/:id/activate-from-central` con header `X-Central-Trial-Webhook-Key`.
3. Al expirar/bloquear: revocación/entitlement en Central para que la caja deje de operar (bloqueo efectivo).

Hasta entonces `posLicenseProvisioning.activated` es `false` salvo activación Central real.

## Seguridad asociada

- Honeypot, CSRF (Origin + double-submit), captcha, rate limit durable Postgres.
- Estado sin token → 404 idéntico (no oracle de existencia).
- Límite: una solicitud abierta (`PENDING_ACTIVATION`|`ACTIVE`) por identidad; máx. 3 en 30 días.
