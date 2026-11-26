# Integración Central ↔ commercial-api — evidencia observada

**Comando:** `node scripts/integration-commercial-bridge.mjs`  
**Fecha:** 2026-11-24  
**pos-platform HEAD (bridge):** ver PR #135  
**Resultado lab HTTP (standalone + ExplicitTest gate):** **PASS** (no sustituye PG/GLOBAL MFA de despliegue)

## Casos

| Caso | Resultado |
|---|---|
| Bridge health `:18443` | PASS |
| commercial-api health `:4011` | PASS |
| Mint **denied** without GLOBAL MFA (bridge key alone) | PASS (`GLOBAL_SESSION_REQUIRED`) |
| Mint GLOBAL + introspect with lab MFA gate headers | PASS (`authority=GLOBAL`) |
| Trial CRM `PENDING_ACTIVATION` | PASS |
| Central issue 120h + webhook activate | PASS |
| Trial `ACTIVE` con ventana **exacta** de Central (120h, `offlineGrace:false`) | PASS |
| Provisioning idempotente ACCEPTED→DUPLICATE | PASS |
| FULFILL solo si Central `fulfillment=ISSUED` + `licenseIds` | código conectado (no FULFILL en QUEUED) |

## Persistencia / revocación / antirreplay / multiempresa (Central)

Evidencia unitaria en pos-platform `tests/commercial-portal-bridge.test.ts` (11/11):

- Mint replay JTI → 409
- Introspect inactive after GLOBAL session revoke
- Expire-sweep REVOKED + `offlineGrace:false`
- Service restart over shared durable store keeps introspect active
- Multiempresa: receipts aislados por `tenantId`
- Provisioning `ISSUED` + `licenseIds` when issuer+tenant+plan present

Main TLS Central mount: `PostgresCommercialPortalBridgeStore` + migration `036` (no memoria).

## Controles

- Sin Factus PRODUCTION / sin cobros reales
- Activación solo por callback Central firmado (`X-Central-Trial-Webhook-Key`)
- Reloj del trial lo fija Central (`startsAt`/`expiresAt`); portal rechaza gracia y ventanas ≠ 120h
- Introspect real HTTP (no simulación de resultado comercial)
- Lab `CENTRAL_BRIDGE_TEST_GATE=1` ≠ login GLOBAL de producto
