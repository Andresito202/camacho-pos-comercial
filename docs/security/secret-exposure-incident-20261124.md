# Secret exposure incident — 2026-11-24

Status: OPEN. Do not dismiss alerts or approve release.

## Confirmed history

Gitleaks (redacted CI report) identified six occurrences in commit `2bc74356ad8483b7a4d10430f82526791e58194b`: two in `apps/web/.next/cache/.previewinfo`, one in `apps/web/.next/cache/.rscinfo`, two in `apps/web/.next/prerender-manifest.json` and one in `apps/web/.next/server/server-reference-manifest.json`. Historical JSON inspection confirms Next.js Preview Mode signing/encryption material and server-reference encryption material. Values must never be copied into issues, reports or logs. The original GitGuardian alert also names generated cache material.

The current branch excludes .next and local environment files; the generated cache file reported by GitGuardian is absent at the reviewed HEAD. This does not remove historical exposure.

## Containment and release requirements

- Determine whether any running deployment reused artifacts or an explicitly configured encryption key from the affected build. Deployment inventory has not been independently established.
- Treat the exposed material as compromised. Do not reuse historical build output, build caches or exposed key material; create a clean build and rotate explicitly configured signing/encryption material if used. Replace affected deployments and invalidate affected preview sessions if applicable.
- Check the GitGuardian password incidents for Docker and environment templates. The known development PostgreSQL default was removed in this PR; do not assume it was never used elsewhere. Rotate any database credentials that match the exposed values, without deleting databases or volumes.
- The redacted secret scan remains blocking for the historical Next.js findings. No exception for these findings has been granted.
- History cleanup, if authorized separately, must coordinate all branches/tags, open PRs, clones and forks; rotation/containment is required regardless. No force push or history rewrite performed here.
- Additional GitGuardian findings require individual review; do not treat Gitleaks as equivalent to GitGuardian.
- Before release, enable appropriate repository secret scanning/push protection and required checks, verify a clean build and staging configuration, and retain non-secret incident evidence.

No production compromise or credential rotation is asserted. No secret values are stored in this document.
