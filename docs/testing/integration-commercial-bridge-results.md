# Integración Central ↔ commercial-api — evidencia observada

**Comando:** `node scripts/integration-commercial-bridge.mjs`  
**Fecha:** 2026-11-24  
**Resultado:** **PASS**

## Casos

| Caso | Resultado |
|---|---|
| Bridge health `:18443` | PASS |
| commercial-api health `:4011` | PASS |
| Mint GLOBAL + introspect | PASS (`authority=GLOBAL`) |
| Trial CRM `PENDING_ACTIVATION` | PASS |
| Central issue 120h + webhook activate | PASS |
| Trial `ACTIVE` con 120h exactas | PASS |
| Provisioning idempotente ACCEPTED→DUPLICATE | PASS |

## Controles

- Sin Factus PRODUCTION / sin cobros reales
- Activación solo por callback Central firmado (`X-Central-Trial-Webhook-Key`)
- Introspect real HTTP (no simulación de resultado comercial)
