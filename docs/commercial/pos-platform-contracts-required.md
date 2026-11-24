# Contratos exactos a implementar después en pos-platform

Este documento lista **únicamente** los contratos que el portal comercial (`camacho-pos-comercial`) requiere de Central / pos-platform. No se implementan aquí. No autoriza cambios en pos-platform desde este PR.

## 1. Login GLOBAL (sesión administrativa del portal)

| Campo | Contrato |
|---|---|
| **Propósito** | Autenticar Superadministrador GLOBAL para AdminGuard del portal |
| **Ruta Central** | `POST {CENTRAL_AUTHORITY_ORIGIN}/v1/sessions/introspect` (ya esperada por `SessionBridgeService`) |
| **Request** | `Authorization: Bearer <token>` emitido por Central tras login GLOBAL |
| **Response OK** | `{ authenticated: true, role: "SUPERADMIN_GLOBAL", subjectId, tenantId: "global" }` |
| **Fail-closed** | Sin origen/credenciales → `PENDING_CENTRAL_CREDENTIALS`; roles no GLOBAL denegados |
| **Pendiente en Central** | UI/login con Turnstile/CSRF/MFA; cookie/Bearer bridge hacia `NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN`; **no** duplicar login POS en el portal |
| **No-claim** | Fixture `ALLOW_ADMIN_TEST_FIXTURE` no es producción |

## 2. Licencias trial de 120 horas

| Campo | Contrato |
|---|---|
| **Duración** | Exactamente **120 horas** desde confirmación Central (`startsAt` + 120h = `expiresAt`) |
| **Emisión** | Central crea entitlement/licencia trial firmada (GLOBAL authority), no el portal |
| **Callback al portal** | `POST {COMMERCIAL_API}/v1/crm/trial/:trialId/activate-from-central` |
| **Auth** | Header `X-Central-Trial-Webhook-Key: <CENTRAL_TRIAL_WEBHOOK_KEY>` (≥32, shared secret) |
| **Body** | `{ "centralLicenseRef": "<id-licencia-central-opaco>" }` (mín. 8 chars) |
| **Efecto portal** | `PENDING_ACTIVATION` → `ACTIVE`; reloj 120h; `activationSource=CENTRAL_LICENSE_CONFIRMED` |
| **Idempotencia** | Mismo `trialId` + mismo `centralLicenseRef` → respuesta idempotente; update condicional |
| **Prohibido** | Simulación local / fixture ACTIVE / arranque al enviar formulario |

## 3. Bloqueo al vencimiento (caja / dispositivo)

| Campo | Contrato |
|---|---|
| **Señal portal** | Estado `EXPIRED`/`BLOCKED` + `POST /v1/crm/trial/expire-due` (misma webhook key) |
| **Efecto efectivo** | Central **revoca o marca no-válida** la licencia trial en el dispositivo POS |
| **Transporte** | Preferible push Central→Local Service / entitlement check fail-closed en arranque de caja |
| **Regla** | Venta ordinaria autorizada local-first **no** debe continuar con trial vencido |
| **No-claim** | Marca CRM `EXPIRED` en el portal **no** sustituye la revocación en pos-platform |

## 4. Aprovisionamiento post-pago (órdenes pagadas)

| Campo | Contrato |
|---|---|
| **Trigger** | Webhook Factus real → Order `PAID` → outbox `ProvisioningRequest` |
| **Ruta Central** | `POST {CENTRAL_AUTHORITY_ORIGIN}{CENTRAL_PROVISIONING_PATH}` default `/v1/commercial/provisioning` |
| **Headers** | `Idempotency-Key: <sha256 provision:{orderId}>`; auth de servicio (mTLS/credencial — por definir en Central) |
| **Payload** | `{ orderId, orderNumber, customerEmail, businessProfileId, licenseUnits, cajaRule: "ONE_LICENSE_ONE_CAJA", items[...] }` |
| **ACK** | Central responde aceptación → portal marca `FULFILLED` / `ACKNOWLEDGED` |
| **Sin Central** | Order permanece `PAID` + provisioning `PENDING` (`PAID + PENDING_PROVISION`) |
| **Sandbox** | `sandbox-simulate-paid` **no** encola provisioning |

## Orden sugerido de implementación (pos-platform)

1. Session introspect + bridge login GLOBAL  
2. Emisión trial 120h + webhook activate-from-central  
3. Revocación/bloqueo al vencimiento hacia Local Service  
4. Ruta `/v1/commercial/provisioning` con idempotencia  

## Explicit non-claims

- Este archivo es **DOCUMENTED** solamente.  
- No acredita RUNTIME en Central ni merge a `main` de pos-platform.  
- El portal comercial no habilita cobros reales ni simula licencias.
