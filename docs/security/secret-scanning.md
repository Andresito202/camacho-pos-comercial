# Secret scanning — process note

## Intent

Prevent accidental commit of API keys, webhook secrets, database passwords, and session material for the commercial portal and Factus Pay.

## Repository hygiene

- `.env`, `.env.local`, and similar files are gitignored (`git check-ignore` → `.env`).
- `.env` is **not** tracked (`git ls-files` must not list it). Only `.env.example` may be committed.
- `.env.example` contains **names and empty/placeholder values only** — never real credentials.
- Production webhook keys must be long random strings (≥ 32 chars when production mode is enabled).
- Local scan (Phase 3): no `sk_live`, `whsec_`, or PEM private keys found in tracked sources; rotate if any appear.

## Recommended automation (when GitHub remote exists)

1. **GitHub secret scanning** / push protection on the remote (org or repo setting).
2. **Dependabot** alerts for vulnerable dependencies (see `.github/dependabot.yml`).
3. Optional CI step: `gitleaks` or `trufflehog` filesystem scan on PRs — add when the remote and Actions runners are available.

This repository may not have a GitHub remote in every environment; the absence of a remote does **not** waive local discipline.

## If a secret was exposed

1. Rotate the credential at the provider (Factus, DB, WhatsApp, Central).
2. Invalidate related sessions / webhook endpoints as needed.
3. Purge the secret from git history only with an explicit owner-approved process — do not force-push casually on shared branches.
4. Record the incident in the ops log without pasting the secret again.
