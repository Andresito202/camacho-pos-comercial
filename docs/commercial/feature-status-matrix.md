# Feature status matrix (commercial claims)

Source: `packages/database/prisma/seed.ts` (`FEATURE_MATRIX`).  
Statuses are **commercial honesty labels**, not automatic proof of POS production readiness.

| Code | Label | Commercial status | Claim note (summary) |
| --- | --- | --- | --- |
| `local_first_sales` | Ventas local-first | AVAILABLE | Claim only where verified from POS runtime evidence |
| `sqlite_single_writer` | SQLite single-writer | AVAILABLE | Portal does not re-verify POS architecture |
| `multi_caja` | Multi-caja | AVAILABLE | 1 licencia = 1 caja unless contract says otherwise |
| `inventory` | Inventario | AVAILABLE | Reflects POS domain docs; sale ≠ deployment proof |
| `central_sync` | Central Sync | IN_CERTIFICATION | Persistence gate on POS line; portal E2E still required |
| `factus_electronic_invoice` | Facturación electrónica FACTUS | IN_CERTIFICATION | Adapter in POS; portal sales remain IN_CERTIFICATION |
| `factus_pay` | FACTUS Pay | IN_CERTIFICATION | Sandbox/mock until credentials + approval |
| `reporting` | Reportes | COMING_SOON | Not commercially available until product evidence |
| `multi_branch` | Multi-sucursal | COMING_SOON | Pending verified packaging |
| `android_companion` | Companion Android | UNPUBLISHED | Unpublished until product decision |

Do not promote a status without evidence. Re-seed or CMS updates should keep this matrix in sync.
