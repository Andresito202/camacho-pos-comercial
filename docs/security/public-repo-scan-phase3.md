# Public-repo secret scan — Phase 3 Block D

Fecha (UTC): 2026-11-24T04:09:30Z  
Rama: `feat/commercial-platform-foundation`  
HEAD base medido: `c6a384244040c6d654674ef8b7996ad6406419a9`  
Alcance: working tree local del portal comercial (excluye `node_modules/`, `.git/`, `.next/`, `pnpm-lock.yaml`, capturas de testing).

## Controles observados

| Control | Resultado |
|---|---|
| `.env` gitignored | **PASS** — `git check-ignore -v .env` → `.gitignore:4:.env` |
| `.env` no tracked | **PASS** — `git ls-files` lista solo `.env.example` y `apps/web/.env.example` |
| Patrones alto riesgo en fuentes tracked | **PASS** — sin matches de `sk_live_`, `AKIA…`, `BEGIN … PRIVATE KEY`, `ghp_`, `github_pat_`, `xox[baprs]-` |
| Credenciales Factus en repo | **PASS (nombres vacíos)** — `.env.example` declara nombres `FACTUS_PAY_*` sin secretos; valores reales no versionados |
| `DATABASE_URL` con password de desarrollo | **NOTA** — aparece en `.env.example` como placeholder local `comercial_dev` (no producción). `.env` local existe pero está gitignored |

## Qué no acredita este scan

- No sustituye GitHub Secret Scanning / push protection en el remoto.
- No escanea historial completo con `gitleaks`/`trufflehog` (recomendado cuando CI remoto esté estable).
- No prueba rotación de secretos en proveedores externos.

## Acción si aparece un secreto real

Rotar en el proveedor, invalidar webhooks/sesiones, y seguir `docs/security/secret-scanning.md`. No pegar el secreto en issues ni en este documento.
