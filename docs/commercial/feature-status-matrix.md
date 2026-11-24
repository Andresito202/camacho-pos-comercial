# Feature status matrix (commercial claims)

Source: `packages/database/prisma/seed.ts` (`FEATURE_MATRIX`).  
Statuses are **commercial honesty labels**, not automatic proof of POS production readiness.

Public labels use merchant language. Technical detail stays in `claimNote` (admin/docs).

| Code | Public label | Commercial status | Claim note (summary) |
| --- | --- | --- | --- |
| `local_first_sales` | Vende incluso cuando se interrumpe internet | AVAILABLE | Claim only where verified from POS runtime evidence |
| `sqlite_single_writer` | Tu caja sigue operando en el local | AVAILABLE | Hidden from public bullets; architecture claim only |
| `multi_caja` | Varias cajas en tu negocio | AVAILABLE | 1 licencia = 1 caja unless contract says otherwise |
| `inventory` | Control de inventario | AVAILABLE | Reflects POS domain docs; sale ≠ deployment proof |
| `central_sync` | Sincroniza información cuando recuperes la conexión | IN_CERTIFICATION | Persistence gate on POS line; portal E2E still required |
| `factus_electronic_invoice` | Emite facturas electrónicas cuando el servicio esté contratado y disponible | IN_CERTIFICATION | Adapter in POS; portal sales remain IN_CERTIFICATION |
| `factus_pay` | Recaudos electrónicos (cuando esté disponible) | IN_CERTIFICATION | Hidden from public bullets; sandbox/mock until credentials + approval |
| `reporting` | Reportes de tu operación | COMING_SOON | Not commercially available until product evidence |
| `multi_branch` | Varias sucursales | COMING_SOON | Pending verified packaging |
| `android_companion` | App móvil companion (cuando esté disponible) | UNPUBLISHED | Unpublished until product decision |

Do not promote a status without evidence. Re-seed or CMS updates should keep this matrix in sync.
