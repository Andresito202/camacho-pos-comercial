# Phase 3 delivery — Block D (SEO, Lighthouse, evidencia visual)

Rama: `feat/commercial-platform-foundation`  
Fecha evidencia (UTC): 2026-11-24  
Estados permitidos (sin % arbitrarios): **IMPLEMENTADO** | **PROBADO** | **PARCIAL** | **BLOQUEADO** | **PENDIENTE**

## Módulos Block D

| Módulo | Estado | Evidencia |
|---|---|---|
| Metadata / titles / descriptions / canonical / OG | **PROBADO** | HTML producción (`next start`) auditado en `/`, `/planes`, `/equipos`, `/soluciones/tiendas` — title, description, canonical, `og:*`, twitter presentes y únicos por ruta |
| H1 uniqueness (rutas clave) | **PROBADO** | H1 distintos observados: inicio, planes, equipos (hero añadido), soluciones/tiendas |
| JSON-LD (Organization / WebSite / FAQ / Breadcrumb) | **PROBADO** | Emitido en HTML; sin `aggregateRating` / `Review` / ratings falsos; FAQ vacío no emite FAQPage |
| `robots.ts` disallow admin/carrito/checkout | **PROBADO** | `robots.txt` Disallow `/admin`, `/carrito`, `/checkout` (+ trailing); meta `noindex, nofollow` en esas rutas |
| Staging noindex | **IMPLEMENTADO** | `isStaging()` + robots `Disallow: /` + sitemap vacío + meta noindex; nginx staging ya proponía `X-Robots-Tag` |
| Sitemap sin superficies privadas | **PROBADO** | `/sitemap.xml` sin `/admin`, `/carrito`, `/checkout` |
| Lighthouse `/` y `/planes` desktop+mobile | **PROBADO** | Scores reales en `docs/testing/lighthouse-phase3.md` |
| Screenshots Phase 3 | **PROBADO** | `docs/testing/screenshots-phase3/` — inicio, planes monthly, equipos, modal, admin × 1920 + 390 |
| Secret scan nota pública | **PROBADO** | `docs/security/public-repo-scan-phase3.md` |
| Search Console / ranking / CWV de campo | **PENDIENTE** | Sin propiedad Search Console ni tráfico real |
| DNS / staging hostname live | **BLOQUEADO** | Depende de DNS/TLS externos (`DNS-PROPOSAL.md`) |
| A11y contrast/target-size home | **PARCIAL** | Lighthouse a11y home = 92; fallos registrados, no fingidos como 100 |

## Referencias

- Matriz 36: `docs/commercial/compliance-matrix-36.md` (secciones 24, 30, 33, 29 actualizadas con esta evidencia)
- Lighthouse: `docs/testing/lighthouse-phase3.md` + `.json`
- Capturas: `docs/testing/screenshots-phase3/`
