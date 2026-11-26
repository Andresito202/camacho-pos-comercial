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

## Rotation runbook

1. Inventory the serving revision in each environment using the deployment
   provider's metadata and the deployed image digest. Record the commit, build
   job, image digest, build-context origin and rollback revisions. Include CI
   caches and archived standalone builds. If the build imported an old
   `.next`, or its provenance is missing, replace that release. A Git SHA alone
   cannot establish which keys an image used.
2. Before replacement, restrict any publicly reachable historical revisions
   under the hosting provider. Build from a clean checkout at a verified commit.
   For Compose's generated-key configuration, use
   `docker compose build --no-cache web` and distribute that single image to
   all replicas. This regenerates Next's preview and action material.
3. If the environment deliberately pins the Server Actions key, replace the
   stored secret with the Base64 encoding of 32 random bytes. For example, use
   `openssl rand -base64 32` with stdout redirected into your secret manager's
   protected intake. With a file mounted by the manager and with the existing
   environment's public build arguments, add
   `--secret id=next_server_actions_key,src="$CAMACHO_KEY_FILE"` to the
   `docker build --no-cache -f infrastructure/docker/Dockerfile.web` command.
   Restrict access to the builder cache and final image, which includes the
   runtime key. Never place the secret in build arguments, logs or Git.
4. Switch all replicas to the rebuilt digest together. In single-host Compose
   with the generated-key configuration use
   `docker compose up -d --no-deps --force-recreate web`. Verify health and
   the active digest plus navigation and server actions with a fresh browser
   session. Invalidate affected preview sessions and expire their old cookies
   where preview is enabled. Remove the old digest from the rollback set and
   replace deployment caches or artifacts that can serve it. Do not use the
   affected build for rollback.
5. Store redacted evidence of the serving and retired digests, the replacement,
   the access restrictions and the results in the incident record. Determine
   rotation status per environment. Until deployment evidence is available,
   usage of the exposed material in any real deployment remains unknown.

## History cleanup approval criteria

Run the existing disposable-mirror rehearsal before choosing a cutover. Before
changing remote refs, take an encrypted, access-restricted backup in incident
storage and record the current branch, tag and open PR SHAs. Verify that the
backup restores only inside an isolated repository. In the rehearsal, verify
the old and cleaned tip trees, run `git fsck --full`, and scan all reachable
history with redaction enabled. An authorized cutover must coordinate branch
protection, review and CI resets, and contributor clones. GitHub-managed PR
refs, forks and cached objects can retain the old history after a branch
rewrite. Obtain a retention and removal decision for those references before
cutover. Keep the incident open until the actual remote historical scanner
passes and deployment containment is verified.
