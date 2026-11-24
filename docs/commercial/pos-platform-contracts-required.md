# Contratos Central ↔ portal comercial (alineados)

Estado: **IMPLEMENTADO en PR compatibles** (bridge Central + consumidores portal).  
No fusiona repositorios. No duplica identidad. No habilita cobros PRODUCTION.

## 1. Login GLOBAL

| Campo | Contrato |
|---|---|
| Mint | `POST /v1/sessions/commercial-bridge/mint` + `X-Central-Commercial-Bridge-Key` |
| Introspect | `POST /v1/sessions/introspect` body `{ audience: "commercial-portal" }` + `Authorization: Bearer` |
| Response | `{ active, role: "SUPERADMIN_GLOBAL", subjectId, tenantId: "global", authority: "GLOBAL" }` |
| Portal | `SessionBridgeService` → AdminGuard |
| MFA/SSA/SAS | Permanecen en Central GLOBAL/BUSINESS existentes; el bridge no crea otra DB de identidad |

## 2. Trial 120 horas

| Campo | Contrato |
|---|---|
| Issue | `POST /v1/commercial/trial/issue` (`trialHours: 120`) |
| Callback | `POST {commercial}/v1/crm/trial/:id/activate-from-central` + `X-Central-Trial-Webhook-Key` |
| Efecto | `PENDING_ACTIVATION` → `ACTIVE`, `expiresAt = startsAt + 120h` |
| Solicitud admin | `POST /v1/crm/trial/:id/request-central-issue` (AdminGuard) |

## 3. Bloqueo al vencimiento

| Campo | Contrato |
|---|---|
| Sweep | `POST /v1/commercial/trial/expire-sweep` |
| CRM | `POST /v1/crm/trial/expire-due` (misma webhook key) |
| Offline caja | Local Service fail-closed por `expires_at` / revocación firmada existente |

## 4. Aprovisionamiento post-pago verificado

| Campo | Contrato |
|---|---|
| Ruta | `POST /v1/commercial/provisioning` |
| Auth | Bridge key + `Idempotency-Key` |
| Payload | orderId, licenseUnits, `cajaRule: ONE_LICENSE_ONE_CAJA`, items |
| Outbox portal | `ProvisioningService.attemptSend` adjunta bridge key |

## Evidencia

`scripts/integration-commercial-bridge.mjs` + tests Central `commercial-portal-bridge.test.ts`.
