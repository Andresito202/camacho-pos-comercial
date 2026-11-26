# Entrega — Portal comercial Camacho POS Colombia

Fecha de evidencia local: 2026-11-24  
Rama: `feat/commercial-platform-foundation`  
Árbol local: `/agent/repos/camacho-pos-comercial`  
Repositorio GitHub: **PENDIENTE** — el token de integración de este agente no tiene `createRepository`. El propietario debe crear `Andresito202/camacho-pos-comercial` (PRIVATE, vacío) y concederlo a la Cursor GitHub App.

## Claim levels (honestos)

| Afirmación | Nivel |
|---|---|
| Código del portal comercial en filesystem | IMPLEMENTED (local) |
| PostgreSQL + migraciones + seed DRAFT | TESTED localmente |
| API health / cart tamper / webhook dedupe / WhatsApp | TESTED localmente (smoke) |
| Frontend rutas públicas + admin fail-closed | TESTED localmente (HTTP 200 + Playwright) |
| Capturas reales multi-viewport | TESTED localmente (72 capturas) |
| CI GitHub Actions | DOCUMENTED (workflow presente; no ejecutado en GitHub sin remote) |
| Repo privado en GitHub + PR | BLOQUEADO (createRepository) |
| FACTUS Pay sandbox real | PENDIENTE_CREDENCIALES |
| Central auth / provisioning live | PENDIENTE_CREDENCIALES (`PENDING_CENTRAL_CREDENTIALS`) |
| Precios publicados / cobros reales | NO AUTORIZADO (catálogo DRAFT) |
| DNS / HTTPS producción | NO CONFIGURADO (solo propuesta documental) |
| Lighthouse scores | NO MEDIDOS en este entorno |

## Relación portal ↔ Central ↔ FACTUS Pay

```text
Cliente → apps/web (Next.js)
        → apps/commercial-api (NestJS + Prisma DB comercial propia)
            → FACTUS Pay (sandbox/prod) para recaudos del vendedor Camacho POS Colombia
            → Central Authority (contratos HTTPS autenticados) para login GLOBAL/BUSINESS
              y aprovisionamiento de licencias (nunca tablas internas del POS)
```

- Recaudo, facturación electrónica, activación de licencia y despacho de hardware tienen estados independientes.
- El portal no duplica auth local-operator ni SQLite del POS.
- Una licencia = una caja (salvo contrato explícito).

## Comandos locales observados

```bash
cd /agent/repos/camacho-pos-comercial
pnpm install
pnpm db:setup
pnpm dev:api   # :4000
pnpm dev       # :3000
pnpm test
pnpm typecheck
pnpm lint
```

DB local usada en evidencia: `postgresql://comercial:***@127.0.0.1:5432/camacho_pos_comercial`

## Matriz de módulos (resumen)

Ver `docs/commercial/acceptance-status.md` y `docs/commercial/feature-status-matrix.md`.
