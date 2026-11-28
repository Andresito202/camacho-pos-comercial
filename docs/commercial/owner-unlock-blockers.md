# Bloqueos que requieren intervención del propietario

HEAD de referencia: `d636c898` (PR #1) emparejado con pos-platform PR #135 `d72735ce`.  
Etiquetas: **BLOQUEADO** (no se puede completar sin el propietario / runtime real).

## 1. Central GLOBAL — sesión Superadmin comercial

| Requisito exacto | Estado | Notas |
|---|---|---|
| `CENTRAL_AUTHORITY_ORIGIN` no vacío y alcanzable (TLS) desde `commercial-api` | **BLOQUEADO** | Sin origen → `PENDING_CENTRAL_CREDENTIALS` (fail-closed) |
| `COMMERCIAL_BRIDGE_KEY` ≥32 compartida con Central | **BLOQUEADO** | Requerido para mint/trial/provisioning |
| `CENTRAL_SESSION_BRIDGE_ENABLED=true` | **BLOQUEADO** | Off → fail-closed en portal |
| Endpoint Central `POST /v1/sessions/introspect` audience `commercial-portal` | **IMPLEMENTADO** en pos-platform PR #135 | Falta runtime Central desplegado |
| Mint GLOBAL: bridge key **+** MFA cookie/CSRF `LICENSE_ISSUE` | **IMPLEMENTADO** (código) | Lab `CENTRAL_BRIDGE_TEST_GATE` **no** es login de producto |
| Cookie/Bearer emitido tras MFA real hacia el portal | **BLOQUEADO** | Requiere WebAuthn + provision GLOBAL |
| Autorización del propietario para tratar introspect como autoridad GLOBAL del portal | **BLOQUEADO** | Decisión de producto |

**No desbloquea:** `ALLOW_ADMIN_TEST_FIXTURE=1` (solo no-producción; no es login comercial).

## 2. Central — aprovisionamiento de licencias tras pago

| Requisito exacto | Estado |
|---|---|
| Ruta Central `POST /v1/commercial/provisioning` + `Idempotency-Key` | **IMPLEMENTADO** en PR #135 |
| Emisión `ISSUED` + `licenseIds` (requiere `tenantId`+`planId` ACTIVE) | **PARCIAL** — código listo; falta tenancy mapeada |
| Credencial de servicio / bridge key en despliegue | **BLOQUEADO** |
| Mapping `ONE_LICENSE_ONE_CAJA` + activación de caja en POS | **BLOQUEADO** (Windows Local Service / DeviceProof) |
| Webhook Factus sandbox **real** (no `sandbox-simulate-paid`) para encolar outbox | Depende de §3 |

Portal: FULFILL **solo** si Central responde `fulfillment=ISSUED` con `licenseIds` (QUEUED no cumple).

## 3. FACTUS Pay — sandbox vs producción

| Requisito exacto | Estado |
|---|---|
| Credenciales `FACTUS_PAY_SANDBOX_EMAIL` / `PASSWORD` + `FACTUS_PAY_SANDBOX_WEBHOOK_KEY` ≥32 | **BLOQUEADO** (ausentes en este entorno) |
| Webhook público → `POST /v1/webhooks/factus-pay/collections?key=…` | **BLOQUEADO** (DNS/TLS campo) |
| `FACTUS_PAY_MODE=PRODUCTION` + cobros reales | **BLOQUEADO** hasta orden expresa — **no habilitar** |

**Reembolsos Factus:** no soportados (`FACTUS_REFUND_UNSUPPORTED`).

## 4. Dispositivos / offline 120h

| Requisito | Estado |
|---|---|
| POS Local Service en Windows con capacidad firmada del trial | **BLOQUEADO** (sin host Windows en el agente) |
| Android (si aplica al alcance) | **BLOQUEADO** (sin ADB/dispositivo) |
| Observación wall-clock de bloqueo a las 120h | **BLOQUEADO** (requiere runtime + tiempo o reloj de lab autorizado) |

## 5. Infra / SEO de campo

| Requisito | Estado |
|---|---|
| DNS + TLS `camachoposcolombia.com` / staging | **BLOQUEADO** |
| Google Search Console + verificación de propiedad | **PENDIENTE** |

## Qué ya no bloquea el código del portal

- Rutas Central de introspect / trial / provisioning (publicadas en PR #135)
- Outbox de provisioning comercial (encola; FULFILL solo con ISSUED+licenseIds)
- Gates MOCK / SANDBOX / PRODUCTION fail-closed
- Activación trial con ventana exacta de Central (rechaza gracia y ≠120h)
- Superadmin operativo vía fixture **solo** en no-prod para demos locales — **no** certificación
