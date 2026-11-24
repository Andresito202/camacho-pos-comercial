import { cookies } from "next/headers";
import { getAdminSession } from "./api";
import { allowAdminTestFixture, getCentralAuthorityOrigin } from "./env";
import type { AdminSession } from "./types";

export const ADMIN_TOKEN_COOKIE = "camacho_admin_token";

/**
 * Login always targets CENTRAL_AUTHORITY_ORIGIN / NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN only.
 * Never hardcode central.camachoposcolombia.com — that hostname is a proposal, not approved wiring.
 */
export function getLoginHref(returnTo = "/admin"): { href: string | null; reason?: string } {
  const origin = getCentralAuthorityOrigin();
  if (!origin) {
    return {
      href: null,
      reason:
        "El inicio de sesión requiere Central Authority. Configure NEXT_PUBLIC_CENTRAL_AUTHORITY_ORIGIN para habilitar el flujo oficial.",
    };
  }
  const url = new URL("/login", origin);
  url.searchParams.set("return_to", returnTo);
  url.searchParams.set("client", "camacho-pos-comercial");
  return { href: url.toString() };
}

export async function requireGlobalAdmin(): Promise<
  { ok: true; session: AdminSession } | { ok: false; session: AdminSession; reason: string }
> {
  if (allowAdminTestFixture()) {
    return {
      ok: true,
      session: {
        authenticated: true,
        role: "GLOBAL",
        displayName: "Fixture GLOBAL (prueba)",
      },
    };
  }

  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;
  const session = await getAdminSession(token);
  if (!session.authenticated || session.role !== "GLOBAL") {
    return {
      ok: false,
      session,
      reason: "Acceso denegado. El panel comercial exige autoridad GLOBAL verificada en Central.",
    };
  }
  return { ok: true, session };
}

export function postLoginDestination(role: string | undefined): {
  href: string;
  label: string;
  note: string;
} {
  switch (role) {
    case "GLOBAL":
      return {
        href: "/admin",
        label: "Panel comercial",
        note: "Superadministrador: licencias y operación comercial. Sin acceso a caja de mostrador.",
      };
    case "ADMIN":
    case "SUPERVISOR":
      return {
        href: "/soporte",
        label: "Centro de soporte",
        note: "Administrador/supervisor no son cajeros. La operación de caja ocurre en Electron o Android.",
      };
    case "CAJERO":
      return {
        href: "/descargas",
        label: "Descargas e instalación",
        note: "No existe POS web para cajero. Instala Electron (Windows) o la app Android del kit contratado.",
      };
    default:
      return {
        href: "/descargas",
        label: "Continuar",
        note: "Tras autenticarte en Central, el destino depende de tu rol firmado. Cajeros usan Electron/Android.",
      };
  }
}
