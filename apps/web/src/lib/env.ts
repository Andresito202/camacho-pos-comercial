/**
 * Browser uses NEXT_PUBLIC_API_URL (host-reachable).
 * Server/SSR prefers COMMERCIAL_API_INTERNAL_URL (e.g. http://commercial-api:4000 in Compose)
 * so containers do not call 127.0.0.1 inside their own network namespace.
 */
export function getApiUrl(): string {
  if (typeof window === "undefined") {
    const internal = process.env.COMMERCIAL_API_INTERNAL_URL?.replace(/\/$/, "");
    if (internal) return internal;
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:4000";
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3000";
}

/**
 * Staging must stay noindex (DNS proposal + nginx + Next robots/metadata).
 * Detect via DEPLOY_ENV / NEXT_PUBLIC_DEPLOY_ENV or a staging.* hostname.
 */
export function isStaging(): boolean {
  const deploy =
    process.env.NEXT_PUBLIC_DEPLOY_ENV?.trim().toLowerCase() ||
    process.env.DEPLOY_ENV?.trim().toLowerCase();
  if (deploy === "staging") return true;
  try {
    const host = new URL(getSiteUrl()).hostname.toLowerCase();
    return host === "staging" || host.startsWith("staging.") || host.includes(".staging.");
  } catch {
    return false;
  }
}

export function getCentralAuthorityOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN?.replace(/\/$/, "");
  return value || null;
}

export function getDefaultWhatsAppNumber(): string {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "573001112233";
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * OPTIONAL staging admin UI fixture (must match API ALLOW_ADMIN_TEST_FIXTURE).
 * NEVER enable in production. Sends X-Admin-Test-Fixture when calling admin APIs.
 */
export function allowAdminTestFixture(): boolean {
  return isDevelopment() && process.env.NEXT_PUBLIC_ALLOW_ADMIN_TEST_FIXTURE === "1";
}

/**
 * Draft catalog preview: development OR Next production *build* phase only.
 * Runtime production never honors ALLOW_DRAFT_BUILD_FALLBACK (closes prod bypass).
 */
export function allowDraftFallback(): boolean {
  if (isDevelopment()) return true;
  // Next sets this while generating the production bundle; runtime production stays fail-closed.
  return process.env.NEXT_PHASE === "phase-production-build";
}
