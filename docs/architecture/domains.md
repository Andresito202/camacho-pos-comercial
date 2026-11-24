# Domains — Camacho POS Comercial

Claim level: **DOCUMENTED**. This file records approved institutional domains vs proposals. It does **not** prove live DNS/TLS.

## Approved (institutional)

| Hostname | Status | Role |
| --- | --- | --- |
| `camachoposcolombia.com` | **Approved** institutional apex | Public commercial portal / marketing site |

The commercial portal (`apps/web`) and seed `SiteSettings.domain` use `camachoposcolombia.com` as the institutional brand domain.

## Proposals (not proven live; not hardcoded as Central)

| Hostname | Status | Notes |
| --- | --- | --- |
| `www.camachoposcolombia.com` | Proposal | Canonical redirect → apex (see `infrastructure/deployment/DNS-PROPOSAL.md`) |
| `api.camachoposcolombia.com` | Proposal | Public commercial-api edge |
| `staging.camachoposcolombia.com` | Proposal | Staging portal; **noindex** |
| `central.camachoposcolombia.com` | **Proposal only** | Mentioned in commercial mission / future Central Authority hosting. **Not found hardcoded** as a login or session origin in this repo or as a substitute for env. |

### Central Authority wiring (mandatory)

- Official login and session bridge use **only** the configured env:
  - API: `CENTRAL_AUTHORITY_ORIGIN`
  - Web: `NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN`
- The “Iniciar sesión” button builds its href from `getCentralAuthorityOrigin()` → `CENTRAL_AUTHORITY_ORIGIN` / `NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN` **only**.
- Empty origin ⇒ fail-closed (no invented hostname, including no silent fallback to `central.camachoposcolombia.com`).

### Relationship to pos-platform

`central.camachoposcolombia.com` is a **commercial mission proposal** for where Central might be published later. It is **not** an approved hardcoded dependency of this portal and must not be written into login, redirects, or session-bridge defaults.

## Related docs

- `infrastructure/deployment/DNS-PROPOSAL.md` — DNS record proposals (DOCUMENTED proposal only)
- `docs/architecture/overview.md` — portal ↔ Central ↔ FACTUS Pay boundaries
