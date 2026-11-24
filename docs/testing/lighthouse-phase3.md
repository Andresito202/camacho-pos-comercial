# Lighthouse — Phase 3 (producción local)

Herramienta: Lighthouse **13.6.0** · Chrome headless (`--no-sandbox`)  
Entorno web: `http://127.0.0.1:3000` (`next start`) · API `:4000`  
Rama: `feat/commercial-platform-foundation`

**Números observados. No inventados.**

## Baseline Block D (UTC 2026-11-24T04:15Z–04:16Z)

| Ruta | Form factor | Performance | Accessibility | Best Practices | SEO |
|---|---|---:|---:|---:|---:|
| `/` | desktop | 100 | 92 | 96 | 100 |
| `/` | mobile | 100 | 92 | 96 | 100 |
| `/planes` | desktop | 96 | 100 | 96 | 100 |
| `/planes` | mobile | 100 | 100 | 96 | 100 |

Fallos baseline `/`: `color-contrast`, `target-size`, `errors-in-console`.

## Cierre pendientes — re-medida `/` a11y + BP (UTC 2026-11-24T04:22Z)

Tras correcciones mínimas (tokens teal, badges, `min-h` botones/nav, favicon/`icon.png`):

| Ruta | Form factor | Accessibility | Best Practices | Auditorías clave |
|---|---|---:|---:|---|
| `/` | desktop | **100** | **100** | `color-contrast`/`target-size`/`errors-in-console` sin fallo |
| `/` | mobile | **100** | **100** | idem |

Artefacto crudo: `/tmp/lh-home-closure.json`, `/tmp/lh-home-closure-mobile.json` (no versionados).

Nota SEO: `/planes` estático + `useSearchParams` en cliente (Suspense).  
No se afirma CWV de campo / Search Console / DNS producción.
