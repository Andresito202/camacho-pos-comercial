# Bloqueos que requieren intervención del propietario

HEAD de referencia al documentar: actualizar con el SHA publicado en PR #1.  
Etiquetas: **BLOQUEADO** (no se puede completar en este portal sin el propietario).

## 1. Central GLOBAL — sesión Superadmin comercial

| Requisito exacto | Estado | Notas |
|---|---|---|
| `CENTRAL_AUTHORITY_ORIGIN` no vacío y alcanzable desde `commercial-api` | **BLOQUEADO** | Sin origen → `PENDING_CENTRAL_CREDENTIALS` (fail-closed) |
| `CENTRAL_SESSION_BRIDGE_ENABLED=true` | **BLOQUEADO** | Hoy off → mismo fail-closed |
| Endpoint Central `POST {origin}/v1/sessions/introspect` con audience `commercial-portal` | **BLOQUEADO** | Contrato ya llamado por `SessionBridgeService`; **no publicado** como API comercial en pos-platform |
| Respuesta introspect con rol `SUPERADMIN_GLOBAL` (o authority `GLOBAL`) | **BLOQUEADO** | `AdminGuard` exige ese rol para precios/catálogo |
| Cookie/Bearer emitido por Central Authority hacia el portal (`NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN`) | **BLOQUEADO** | “Iniciar sesión” solo redirige; no duplica login POS |
| Autorización expresa del propietario para tratar introspect como autoridad GLOBAL del portal | **BLOQUEADO** | Decisión de producto en la línea POS |

**No desbloquea:** `ALLOW_ADMIN_TEST_FIXTURE=1` (solo no-producción; no es login comercial).

## 2. Central — aprovisionamiento de licencias tras pago real

| Requisito exacto | Estado |
|---|---|
| Ruta Central que acepte `POST {CENTRAL_AUTHORITY_ORIGIN}{CENTRAL_PROVISIONING_PATH}` (default `/v1/commercial/provisioning`) con `Idempotency-Key` | **BLOQUEADO** — no publicada en pos-platform |
| Credencial de servicio / mTLS acordada (no inventada aquí) | **BLOQUEADO** |
| Mapping `ONE_LICENSE_ONE_CAJA` acordado | **BLOQUEADO** |
| Webhook Factus **real** (no `sandbox-simulate-paid`) para encolar outbox | Depende de §3 |

Ver `docs/commercial/central-provisioning-status.md`.

## 3. FACTUS Pay — cobros reales (PRODUCTION)

| Requisito exacto | Estado |
|---|---|
| `FACTUS_PAY_MODE=PRODUCTION` | Owner |
| `FACTUS_PAY_PRODUCTION_ENABLED=true` (kill-switch; default `false`) | Owner |
| `FACTUS_PAY_PRODUCTION_EMAIL` + `FACTUS_PAY_PRODUCTION_PASSWORD` (o aliases CLIENT_ID/SECRET) | Owner / Factus |
| `FACTUS_PAY_PRODUCTION_WEBHOOK_KEY` ≥ 32 chars registrado en panel Factus apuntando a `POST /v1/webhooks/factus-pay/collections?key=…` | Owner / Factus |
| Cuenta Factus Pay producción activa y montos en COP enteros | Owner |
| Autorización expresa del propietario para habilitar cobros reales | **BLOQUEADO** hasta orden |

**Sandbox (no producción):** email/password + webhook key sandbox.  
**Reembolsos Factus:** **no soportados** en este portal — no hay API de refund automatizado; `MANUAL_REFUND_MARK` rechaza `provider=FACTUS_PAY` con `FACTUS_REFUND_UNSUPPORTED`.

Ver `docs/commercial/factus-pay-integration-status.md`.

## 4. Infra / SEO de campo (fuera del código del portal)

| Requisito | Estado |
|---|---|
| DNS + TLS `camachoposcolombia.com` / staging | **BLOQUEADO** |
| Google Search Console + verificación de propiedad | **PENDIENTE** |
| CWV de campo (CrUX) | **PENDIENTE** |

## Qué ya no bloquea el código del portal

- Outbox de provisioning comercial (encola; no inventa éxito Central)
- Gates MOCK / SANDBOX / PRODUCTION fail-closed
- Superadmin operativo vía fixture **solo** en no-prod para demos locales
- Gestión local de despacho/entrega/cancelación/devolución logística sin mover dinero Factus
