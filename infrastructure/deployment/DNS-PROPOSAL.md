# DNS proposal — camachoposcolombia.com

**Status: PROPOSAL ONLY.**  
These records are a recommended layout for when DNS is configured by the domain owner.  
**This document does not claim that DNS, TLS certificates, or CDN are already configured.**

## Proposed hostnames

| Hostname | Purpose | Upstream |
| --- | --- | --- |
| `camachoposcolombia.com` | Apex marketing + portal | web (:3000) via nginx/TLS edge |
| `www.camachoposcolombia.com` | Canonical redirect | **301 → apex** |
| `api.camachoposcolombia.com` | Public commercial-api | commercial-api (:4000) |
| `staging.camachoposcolombia.com` | Staging portal | staging stack; **noindex** |

Optional later (still proposals): `admin.` (if split), `status.`, media CDN hostname.

## Proposed record types (illustrative)

```text
; PROPOSAL — replace TARGET with real load balancer / VPS A/AAAA or CNAME
camachoposcolombia.com.        A       TARGET_IPV4
www.camachoposcolombia.com.    CNAME   camachoposcolombia.com.
api.camachoposcolombia.com.    A       TARGET_IPV4
staging.camachoposcolombia.com. A      STAGING_IPV4
```

TLS: terminate at nginx, Caddy, or cloud LB with certificates issued after DNS points correctly.

## Nginx alignment

See `infrastructure/nginx/default.conf`:

- WWW → apex 301
- `api.` → API upstream
- staging `X-Robots-Tag: noindex, nofollow, noarchive` + restrictive `robots.txt`

## What is NOT proven by this repo

- Nameservers or registrar settings
- Propagation of any record
- Let’s Encrypt / ACME success
- Email / SPF / DKIM for transactional mail

Claim level for DNS: **DOCUMENTED (proposal)** until an operator verifies live resolution and TLS.
