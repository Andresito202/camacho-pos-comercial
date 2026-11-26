# Certificación integral portal ↔ Central — intento 2026-11-24

| Campo | Valor |
|---|---|
| camacho-pos-comercial HEAD | `d636c8983aef192cf56be2d79ca8fab4c9b39a9f` (PR #1) |
| pos-platform HEAD | `d72735ce8d407a061abaefbce73c83428d7e0d05` (PR #135) |
| CI exact-head portal | **2/2 success** |
| Certificación comercial E2E | **NO EJECUTABLE** en este agente — no se simula |

## Qué ya no bloquea el *código* del portal (tras PR #135)

| Capacidad | Estado código |
|---|---|
| `POST /v1/sessions/introspect` + mint GLOBAL (Central) | Publicado en pos-platform PR #135 |
| `POST /v1/commercial/trial/issue` + webhook activate | Publicado; portal honra ventana Central 120h / `offlineGrace:false` |
| `POST /v1/commercial/provisioning` | Publicado; FULFILL solo con `ISSUED` + `licenseIds` |
| Outbox provisioning comercial | IMPLEMENTADO |

## Qué sigue bloqueando la certificación (runtime)

| # | Bloqueo exacto |
|---|---|
| 1 | `CENTRAL_AUTHORITY_ORIGIN` TLS alcanzable + bridge keys compartidas |
| 2 | Login GLOBAL MFA real (WebAuthn) — **prohibido** sustituir con `ALLOW_ADMIN_TEST_FIXTURE` / lab gate |
| 3 | Postgres comercial + Central con tenant/plan para emisión ISSUED |
| 4 | Credenciales Factus **SANDBOX** reales (`FACTUS_PAY_SANDBOX_EMAIL/PASSWORD` + webhook key) y webhook público |
| 5 | Dispositivo Windows (Local Service) y/o Android para activación de caja / offline / reinicio |
| 6 | Observación wall-clock de vencimiento 120h (o reloj firmado de laboratorio autorizado por el propietario) |

## Evidencia local reutilizada (no comercial E2E)

- Integración lab HTTP previa documentada en `integration-commercial-bridge-results.md` (usa `CENTRAL_BRIDGE_TEST_GATE` — **no** es login GLOBAL de producto).
- Unit Central bridge 11/11 + CI ambos HEAD — ver doc espejo en pos-platform.
