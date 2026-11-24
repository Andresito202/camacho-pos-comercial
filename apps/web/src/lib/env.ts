export function getApiUrl(): string {
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
