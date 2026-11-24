# Compliance matrix — 36 mission sections

**Baseline HEAD (before Phase 2 fixes):** `9a7b371ebe7dd99a04f8c75dffb90358e2e4524c`  
**Branch:** `feat/commercial-platform-foundation`  
**Evidence captured:** 2026-11-24T03:42:31Z (UTC)  
**Runtime observed:** API `:4000`, web `:3000`, Postgres `camacho_pos_comercial` with **4** plans (`esencial`, `profesional`, `empresarial`, `perpetua`), all `DRAFT`.

Statuses are exclusive. File/route/Prisma presence alone does **not** mean complete.

| # | Section | Status | Evidence note (concise) |
|---:|---|---|---|
| 1 | REPOSITORIO INDEPENDIENTE | Bloqueado por dependencia externa | Árbol Git local existe; **sin `git remote`** y sin repo privado GitHub (`createRepository` no disponible). |
| 2 | DOMINIO Y SUBDOMINIOS | Bloqueado por dependencia externa | Solo `infrastructure/deployment/DNS-PROPOSAL.md`. Sin DNS/TLS live para `camachoposcolombia.com`. |
| 3 | ARQUITECTURA TECNOLÓGICA | Implementado y probado | Monorepo Next/Nest/Prisma en ejecución (`/health` 200, web `/` 200). |
| 4 | INVESTIGACIÓN VISUAL Y COMPETITIVA | Implementación parcial | `docs/competitive-research/README.md` breve; no auditoría visual profunda ni capturas de competidores. |
| 5 | DISEÑO PROFESIONAL OBLIGATORIO | Implementación parcial | Logo amarillo/navy en `apps/web/public/brand`; UI comercial presente; pulido profesional completo no acreditado. |
| 6 | IMÁGENES Y RECURSOS GRÁFICOS | Implementación parcial | SVG/iconos propios en `public/images`; no set fotográfico completo de terminales/impresoras. |
| 7 | ESTRUCTURA COMPLETA DE NAVEGACIÓN | Implementado y probado | Rutas App Router reales; spot-check HTTP 200 en `/`, `/planes`, `/cobertura`, `/blog`, `/soporte`, `/promociones`, `/admin`. |
| 8 | PÁGINA DE INICIO Y CONVERSIÓN COMERCIAL | Implementación parcial | Home 200 + capturas; no se acredita funnel de conversión comercial completo (cobro real / publicación). |
| 9 | DESCRIPCIÓN DEL PRODUCTO | Implementación parcial | `/software-pos` + matriz de features con estados honestos; claims dependen de seed, no de POS producción. |
| 10 | PLANES, LICENCIAS Y PRECIOS | Implementado y probado | Precios desde Postgres vía `GET /v1/catalog/plans`; FE `/planes` muestra 4 planes COP DRAFT. Compra real bloqueada por DRAFT. |
| 11 | CATÁLOGO DE EQUIPOS | Implementación parcial | 4 `Product` en DB + rutas `/equipos`; catálogo hardware mínimo, no tienda completa. |
| 12 | MODAL REAL DE CONTRATACIÓN | Implementación parcial | `HireModal` abre y agrega a carrito local; flujo modal→checkout→pago real no E2E con PUBLISHED+Factus live. |
| 13 | INTEGRACIÓN WHATSAPP | Implementado y probado | `POST /v1/whatsapp/catalog-message` → 201 con URL/texto; número `DEV_PLACEHOLDER` (esperado en dev). Admin del número vía Central/ajustes incompleto. |
| 14 | CARRITO DE COMPRAS | Implementado y probado | `POST /v1/cart` + add item; **tamper** `PRICE_TAMPERING_REJECTED` 400 observado. Persistencia server-side OK. |
| 15 | PASARELA DE PAGOS FACTUS PAY | Implementación parcial | Adapter sandbox mock + webhook idempotente observados; **sin credenciales Factus reales** / producción fail-closed. |
| 16 | APROVISIONAMIENTO Y LICENCIAS | Bloqueado por dependencia externa | Código enqueue existe; runtime marca `PENDING_CENTRAL_CREDENTIALS` sin `CENTRAL_AUTHORITY_ORIGIN`. |
| 17 | BACKEND COMERCIAL Y BASE DE DATOS | Implementado y probado | Prisma migrate+seed; 51 tablas; API escribe/lee Postgres (planes, carrito, pagos, consent). |
| 18 | PANEL SUPERADMINISTRADOR COMERCIAL | Implementación parcial | UI `/admin/*` stub; API admin **401** `PENDING_CENTRAL_CREDENTIALS` sin Central (fail-closed verificado). |
| 19 | PROMOCIONES, BENEFICIOS Y BLACK FRIDAY | Implementación parcial | Cupones en schema/servicio (2 seed); sin motor completo Black Friday/Cyber verificado en UI/API list. |
| 20 | COBERTURA NACIONAL DE COLOMBIA | Implementación parcial | `GET /v1/coverage/departments` 200; 28 ciudades seed + páginas `/cobertura`; no DIVIPOLA completa. |
| 21 | SOPORTE Y PANEL DE DUDAS | Implementación parcial | Páginas `/soporte`/`/preguntas-frecuentes` + tickets API; FAQ publicados vía API = `[]` (seed no PUBLISHED). |
| 22 | GARANTÍAS, PRIVACIDAD Y POLÍTICAS | Implementación parcial | Rutas `/legal/*` 200 con borradores estáticos; docs legales DB no servidos como PUBLISHED binding. |
| 23 | COOKIES Y ANALÍTICA | Implementación parcial | `POST /v1/consent` 201 (COOKIES); sin banner de consentimiento FE ni gated analytics real. |
| 24 | SEO PROFESIONAL Y TÉCNICO | Implementación parcial | `metadata`, `sitemap.ts`, `robots.ts`, JSON-LD parcial; Search Console / scores no medidos. |
| 25 | INVESTIGACIÓN DE PALABRAS CLAVE | Implementado sin evidencia | Solo `docs/seo/keyword-hypotheses.md`; sin validación de volumen/ranking. |
| 26 | BLOG Y CONTENIDO COMERCIAL | Implementación parcial | Rutas `/blog` 200; 1 post DRAFT en DB → `GET /v1/content/blog` = `[]`. Artículos iniciales incompletos. |
| 27 | REDES SOCIALES Y CONTACTO | Implementación parcial | Contacto/WhatsApp presentes; `SocialLink` seed no PUBLISHED → API social `[]`. |
| 28 | NOTIFICACIONES | Implementación parcial | Outbox + worker **stub** (marca SENT sin proveedor real). |
| 29 | SEGURIDAD | Implementación parcial | Fail-closed admin, anti-tamper precios, webhook key, validación Zod; HTTPS prod / CSRF completo / secret scanning CI remoto no acreditados aquí. |
| 30 | RENDIMIENTO Y ACCESIBILIDAD | Pendiente | Objetivos Lighthouse/CWV **no medidos** en este entorno. |
| 31 | DESPLIEGUE E INFRAESTRUCTURA | Implementado sin evidencia | `docker-compose.yml` + nginx/runbooks presentes; Docker **no instalado** aquí; compose no ejecutado en esta sesión. |
| 32 | PRUEBAS OBLIGATORIAS | Implementación parcial | Vitest contratos+API y smoke manual observados históricamente; E2E Playwright es esqueleto; lista mandatoria de la misión incompleta. |
| 33 | VALIDACIÓN VISUAL | Implementado y probado | 72 capturas en `docs/testing/screenshots/` (multi-viewport). |
| 34 | ORDEN DE EJECUCIÓN | Implementación parcial | Fundación (bloques 0–2-ish) materializada; bloques posteriores (pago live, Central, DNS, entrega GH) abiertos. |
| 35 | CRITERIOS DE ACEPTACIÓN | Pendiente | Criterios de “completo” de la misión **no** cumplidos (repo privado, cobros, aprovisionamiento, DNS, etc.). |
| 36 | ENTREGA FINAL | Bloqueado por dependencia externa | Sin URL de repo privado, sin PR remoto, sin entrega formal; HEAD local = baseline `9a7b371`. |

## Counts (this matrix)

| Status | # |
|---|---:|
| Implementado y probado | 8 |
| Implementado sin evidencia | 2 |
| Implementación parcial | 20 |
| Pendiente | 2 |
| Bloqueado por dependencia externa | 4 |

---

## FE → BE → DB connection proof (commands run this session)

Environment: `DATABASE_URL=postgresql://comercial:***@127.0.0.1:5432/camacho_pos_comercial`, API PID on `:4000`, Next on `:3000`, HEAD `9a7b371`.

### 1) Catalog plans (BE ← DB; FE renders)

```bash
curl -sS http://127.0.0.1:4000/v1/catalog/plans
# http 200 — 4 plans, publicationStatus DRAFT, slugs:
# esencial, profesional, empresarial, perpetua
# esencial MONTHLY amountCents=49900

psql -h 127.0.0.1 -U comercial -d camacho_pos_comercial \
  -c 'SELECT slug, "publicationStatus" FROM "Plan" ORDER BY slug;'
# 4 rows, all DRAFT

curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/planes
# 200 — HTML contains Esencial/Profesional/Empresarial/Perpetua, "49.900", "COP", "Borrador"
```

### 2) Cart price tamper (server authority)

Temporarily published `esencial` MONTHLY → add with `expectedUnitAmountCents = 49901` → restored DRAFT:

```text
http 400
{"code":"PRICE_TAMPERING_REJECTED","message":"Client-supplied unit amount does not match server price."}
```

### 3) WhatsApp builder

```bash
curl -sS -X POST http://127.0.0.1:4000/v1/whatsapp/catalog-message \
  -H 'content-type: application/json' \
  -d '{"planSlug":"esencial","utmSource":"compliance-matrix"}'
# http 201 — wa.me URL + text; phoneMarkedDevPlaceholder: true
```

### 4) Webhook duplicate (idempotency)

Checkout sandbox mock → `paymentReference=CPC-PAY-dd752ba85d75b61e3d0ecf16` → webhook twice with sandbox key:

```text
webhook 1 → http 201 {"result":"STORED"}
webhook 2 → http 201 {"result":"DUPLICATE"}
```

SQL:

```text
eventType=collection.paid  referenceCode=CPC-PAY-dd752ba85d75b61e3d0ecf16  amountCents=49900
```

### 5) Admin without Central (fail-closed)

```bash
curl -sS http://127.0.0.1:4000/v1/admin/catalog/plans
# http 401
# {"code":"PENDING_CENTRAL_CREDENTIALS",
#  "message":"Central authority origin/credentials are not configured. Admin routes fail closed."}
```

FE `/admin` 200 shows login gated on Central (`NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN` unset).

---

## Honesty constraints

- DRAFT catalog is **visible** in development; purchase remains unpublished-gated.
- FACTUS Pay path exercised here is **SANDBOX_MOCK**, not live Factus credentials.
- This matrix classifies the **mission’s 36 sections** against current code + observed runtime at baseline `9a7b371`; it does not authorize Phase 2 claim upgrades.
