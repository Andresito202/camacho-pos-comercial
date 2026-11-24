# Lighthouse — Phase 3 Block D (producción local)

Fecha (UTC): 2026-11-24T04:06Z–04:07Z  
Rama: `feat/commercial-platform-foundation`  
HEAD al medir: `c6a384244040c6d654674ef8b7996ad6406419a9` (árbol web reconstruido con `pnpm build:web` antes de `next start`)  
Entorno: `next start` (`NODE_ENV=production`) en `http://127.0.0.1:3000`  
API: `http://127.0.0.1:4000`  
Herramienta: Lighthouse **13.6.0** via `npx lighthouse`, Chrome headless (`--no-sandbox`)  
Categorías: performance, accessibility, best-practices, seo  

**Estos números son observados en esta corrida. No inventados.**

| Ruta | Form factor | Performance | Accessibility | Best Practices | SEO |
|---|---|---:|---:|---:|---:|
| `/` | desktop (`--preset=desktop`) | 100 | 92 | 96 | 100 |
| `/` | mobile (`--form-factor=mobile`) | 100 | 92 | 92 | 100 |
| `/planes` | desktop (`--preset=desktop`) | 100 | 100 | 96 | 100 |
| `/planes` | mobile (`--form-factor=mobile`) | 100 | 100 | 92 | 100 |

JSON compacto: `docs/testing/lighthouse-phase3.json`  
Artefactos crudos de la corrida (no versionados): `/tmp/lh-phase3/{home,planes}-{desktop,mobile}.json`

## Hallazgos no ocultados (scores < 100)

| Corrida | Categoría | Auditorías fallidas observadas |
|---|---|---|
| `/` desktop + mobile | Accessibility | `color-contrast`, `target-size` |
| `/` y `/planes` (ambas) | Best Practices | `errors-in-console` |
| `/` y `/planes` mobile | Best Practices | `image-aspect-ratio` |

No se afirma CWV de campo (CrUX/Search Console). No se generaliza a DNS/producción pública.

## Comandos ejecutados

```bash
pnpm build:web
# apps/web: pnpm start  → :3000
npx lighthouse http://127.0.0.1:3000/ --preset=desktop --only-categories=performance,accessibility,best-practices,seo ...
npx lighthouse http://127.0.0.1:3000/ --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo ...
npx lighthouse http://127.0.0.1:3000/planes --preset=desktop ...
npx lighthouse http://127.0.0.1:3000/planes --form-factor=mobile ...
```
