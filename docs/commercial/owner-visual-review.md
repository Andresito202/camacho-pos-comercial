# Revisión visual integral — guía del propietario

**HEAD de referencia:** `fcff259` (galería Playwright) · producto CI SUCCESS en `67da254`.  
**Objetivo:** ver y evaluar el portal completo sin fusionar a `main`, sin tocar `pos-platform` y sin cobros reales.

## Galería capturada (Playwright fullPage)

72 PNG escritorio `1920×1080` + móvil `390×844` contra app real + PostgreSQL:

- Índice HTTPS: [docs/testing/visual-review-final/INDEX.md](https://github.com/Andresito202/camacho-pos-comercial/blob/feat/commercial-platform-foundation/docs/testing/visual-review-final/INDEX.md)
- Raw: https://raw.githubusercontent.com/Andresito202/camacho-pos-comercial/feat/commercial-platform-foundation/docs/testing/visual-review-final/INDEX.md

Superadmin en esas capturas usa fixture de desarrollo; no es producción.

## 1. Staging protegido — estado honesto

| Pregunta | Respuesta |
|---|---|
| ¿Hay URL pública de staging ya desplegada? | **No.** `staging.camachoposcolombia.com` es **propuesta DNS** (`infrastructure/deployment/DNS-PROPOSAL.md`). Sin DNS/TLS live no hay URL protegida que este repo pueda entregar. |
| ¿Qué usar hoy? | Stack local en Windows (Docker) o `pnpm` + PostgreSQL. URLs: `http://127.0.0.1:3000` (web) y `http://127.0.0.1:4000` (API). |
| ¿Nginx local opcional? | `http://127.0.0.1:8080` con `docker compose --profile with-nginx up -d` |

Cuando el propietario publique DNS staging, configurar `NEXT_PUBLIC_SITE_URL` / `DEPLOY_ENV=staging` / `NEXT_PUBLIC_DEPLOY_ENV=staging` para **noindex** automático (`isStaging()`).

---

## 2. Levantar el portal completo en Windows (Docker + PostgreSQL)

### Requisitos

- Windows 10/11 con **Docker Desktop** (Engine + Compose) y WSL2 recomendado  
- Git + cuenta con acceso al repo `Andresito202/camacho-pos-comercial`  
- Rama: `feat/commercial-platform-foundation` @ `67da254` (o HEAD actual de esa PR)

### Pasos (PowerShell o terminal en la carpeta del repo)

```powershell
git clone https://github.com/Andresito202/camacho-pos-comercial.git
cd camacho-pos-comercial
git checkout feat/commercial-platform-foundation
git pull

copy .env.example .env
# Editar .env: NO poner FACTUS_PAY_PRODUCTION_ENABLED=true
# Dejar FACTUS_PAY_MODE=SANDBOX y FACTUS_PAY_PRODUCTION_ENABLED=false

docker compose up -d --build

# Migraciones + catálogo de ejemplo
docker compose exec commercial-api sh -c "cd /app && pnpm prisma:migrate:deploy && pnpm prisma:seed"
```

### Abrir

| Servicio | URL |
|---|---|
| Portal | http://127.0.0.1:3000 |
| API health | http://127.0.0.1:4000/health |
| Postgres (host) | `127.0.0.1:5433` → contenedor `5432` |

### Alternativa sin imagen web Docker (más rápida para UI)

```powershell
docker compose up -d postgres
# En .env: DATABASE_URL=...@127.0.0.1:5433/...
pnpm install
pnpm prisma:generate
pnpm db:setup
pnpm dev:api
pnpm dev:web
```

---

## 3. Checklist de páginas a revisar (público)

Recorrer en escritorio y móvil (DevTools o teléfono en la misma LAN si se expone el host).

### Marketing / catálogo

| Ruta | Qué evaluar |
|---|---|
| `/` | Hero marca, CTAs, sectores, planes/equipos destacados |
| `/software-pos` | Copy comercial (sin jerga técnica) |
| `/planes` | Mensual/Anual; perpetua aparte; `?solucion=completo` |
| `/planes/[slug]` | Detalle plan |
| `/equipos` | Filtros, badge ilustración referencial |
| `/equipos/[slug]` | Detalle producto/kit |
| `/promociones` | Ventanas America/Bogota (solo activas) |
| `/soluciones` y `/soluciones/[slug]` | Sectores |
| `/cobertura` / `/cobertura/[ciudad]` | Cobertura |
| `/nosotros`, `/blog`, `/preguntas-frecuentes` | Contenido |
| `/contacto`, `/solicitar-demo`, `/contratar` | Formularios → Postgres (CRM) |
| `/soporte`, `/descargas` | Soporte / instalador (sin POS web cajero) |

### Contratación / carrito

| Ruta | Qué evaluar |
|---|---|
| Modal **Contratar** en `/planes` | Lead real a API |
| WhatsApp flotante / CTAs | Mensaje con plan/modalidad/precio |
| `/carrito` | Totales servidor (COP enteros) |
| `/checkout` | Checkout; en sandbox sin cobro real |
| `/checkout/estado` | Estado pedido/pago |

### Legal

`/legal/terminos`, `privacidad`, `cookies`, `garantias`, `envios`, `devoluciones`, `tratamiento-de-datos`

### Admin (tras §4)

`/admin`, `/admin/planes`, `/equipos`, `/pedidos`, `/pagos`, `/clientes`, `/promociones`, `/contenidos`, `/tickets`, `/ajustes`

Capturas de referencia (no sustituyen la revisión en vivo): `docs/testing/screenshots-phase3/`.

---

## 4. Superadministrador en desarrollo (sin bypass de producción)

### Reglas fail-closed

| Entorno | Fixture `ALLOW_ADMIN_TEST_FIXTURE` |
|---|---|
| `NODE_ENV=production` | **Rechazado** por esquema/env y por `AdminGuard` |
| `NODE_ENV=development` (o test) + flag `1` | Acepta header `X-Admin-Test-Fixture: GLOBAL_SUPERADMIN` |

**No** es login comercial. **No** habilitar en producción ni en staging público.

### Cómo revisar el panel en Windows (recomendado)

Usar **modo desarrollo** (no el contenedor `web` con `NODE_ENV=production` del compose):

1. `docker compose up -d postgres` (o Postgres local).  
2. En `.env` (API):

```env
NODE_ENV=development
ALLOW_ADMIN_TEST_FIXTURE=1
CENTRAL_SESSION_BRIDGE_ENABLED=false
FACTUS_PAY_PRODUCTION_ENABLED=false
```

3. En `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_ALLOW_ADMIN_TEST_FIXTURE=1
```

4. `pnpm dev:api` y `pnpm dev:web`.  
5. Abrir http://127.0.0.1:3000/admin — debe verse el banner de fixture.  
6. Probar: precios, productos/kits/imágenes, promociones, WhatsApp/contenidos, pedidos (despacho).  
7. Verificar en público (`/planes`, `/equipos`) que un cambio **PUBLISHED** se refleja.

### Producción / staging real

Solo Central GLOBAL (`CENTRAL_AUTHORITY_ORIGIN` + bridge + introspect). Fixture **apagado**.

---

## 5. Contratos exactos pendientes en Central

Detalle: `docs/commercial/owner-unlock-blockers.md`, `central-provisioning-status.md`.

### A) Login GLOBAL (Superadmin comercial)

| Contrato | Uso en portal |
|---|---|
| Origen HTTPS en `CENTRAL_AUTHORITY_ORIGIN` / `NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN` | “Iniciar sesión” → `{origin}/login?return_to=/admin&client=camacho-pos-comercial` |
| `CENTRAL_SESSION_BRIDGE_ENABLED=true` | Activa bridge |
| `POST {origin}/v1/sessions/introspect` | Body `{ "audience": "commercial-portal" }`; Bearer del usuario |
| Respuesta con rol / authority **GLOBAL** (`SUPERADMIN_GLOBAL`) | `AdminGuard` / `canManageCatalogPrices` |

**Estado:** ruta/audience comerciales **no publicadas** como API del portal en la línea POS. Sin eso → `PENDING_CENTRAL_CREDENTIALS`.

### B) Aprovisionamiento de licencias tras pago real

| Contrato | Uso en portal |
|---|---|
| `POST {CENTRAL_AUTHORITY_ORIGIN}{CENTRAL_PROVISIONING_PATH}` | Default path `/v1/commercial/provisioning` |
| Header `Idempotency-Key` | Outbox `ProvisioningRequest` |
| Payload JSON | orderId, orderNumber, customerEmail, licenseUnits, items… |

**Estado:** outbox comercial listo; aceptación Central **BLOQUEADA** hasta publicar la ruta y credencial de servicio. Webhook Factus real (no simulate) encola; simulate **no** aprovisiona.

---

## 6. Conectar FACTUS Pay sandbox real (sin producción)

Guía completa: `docs/commercial/factus-pay-integration-status.md`. Docs oficiales: https://pay-developers.factus.com.co/

### Variables (solo sandbox)

```env
FACTUS_PAY_MODE=SANDBOX
FACTUS_PAY_SANDBOX_ENABLED=true
FACTUS_PAY_PRODUCTION_ENABLED=false
FACTUS_PAY_SANDBOX_BASE_URL=https://pay-api-sandbox.factus.com.co
FACTUS_PAY_SANDBOX_EMAIL=<email sandbox Factus>
FACTUS_PAY_SANDBOX_PASSWORD=<password sandbox>
FACTUS_PAY_SANDBOX_WEBHOOK_KEY=<clave ≥32 caracteres>
```

(`CLIENT_ID` / `CLIENT_SECRET` son alias del email/password.)

### Pasos

1. Obtener credenciales sandbox en el panel Factus Pay.  
2. Rellenar las variables anteriores en `.env` (nunca en git).  
3. Reiniciar `commercial-api`.  
4. En Factus, registrar webhook:

```text
POST https://<host-publico-api>/v1/webhooks/factus-pay/collections?key=<FACTUS_PAY_SANDBOX_WEBHOOK_KEY>
```

En local hace falta túnel (ngrok/cloudflared) hacia `:4000`.  
5. Flujo: carrito → checkout → QR sandbox → pago de prueba → webhook `paid`.  
6. **No** poner `FACTUS_PAY_PRODUCTION_ENABLED=true` ni credenciales de producción.

Sin email/password sandbox el adapter queda en **MOCK** (`SANDBOX_MOCK`); no es cobro real ni sandbox HTTP.

---

## 7. Inventario de dominios y subdominios

Fuente normativa: `docs/architecture/domains.md` + `infrastructure/deployment/DNS-PROPOSAL.md`.

| Hostname | Estado | Rol |
|---|---|---|
| `camachoposcolombia.com` | **Aprobado** (apex institucional) | Portal comercial / marketing |
| `www.camachoposcolombia.com` | Propuesta | 301 → apex |
| `api.camachoposcolombia.com` | Propuesta | Edge commercial-api |
| `staging.camachoposcolombia.com` | Propuesta | Staging; **noindex** |
| `central.camachoposcolombia.com` | Propuesta misión (no cableado) | Posible Central; login **solo** vía env `CENTRAL_AUTHORITY_ORIGIN` |

**No probado por este repo:** resolución DNS, TLS, CDN, correo SPF/DKIM.

---

## 8. Controles que el propietario debe mantener

- Merge a `main`: **no** hasta autorización expresa.  
- `FACTUS_PAY_PRODUCTION_ENABLED=false`.  
- `ALLOW_ADMIN_TEST_FIXTURE` / `NEXT_PUBLIC_ALLOW_ADMIN_TEST_FIXTURE` solo en desarrollo.  
- No modificar `pos-platform` desde esta revisión.  
- Precios de catálogo en seed suelen estar `DRAFT` (visibles en no-prod con preview); publicar desde `/admin` para ver como “producción lógica”.
