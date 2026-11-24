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

/** Draft catalog preview is allowed in development and during `next build` when API is offline. */
export function allowDraftFallback(): boolean {
  if (isDevelopment()) return true;
  if (process.env.ALLOW_DRAFT_BUILD_FALLBACK === "1") return true;
  // Next sets this while generating the production bundle; runtime production stays fail-closed.
  return process.env.NEXT_PHASE === "phase-production-build";
}
