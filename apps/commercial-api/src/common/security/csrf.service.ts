import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

const CSRF_COOKIE = "camacho_csrf";
const CSRF_HEADER = "x-csrf-token";

/**
 * Double-submit CSRF for cookie-authenticated / same-site mutating CRM posts.
 * Token is issued by GET /v1/security/csrf and must match cookie + header.
 */
@Injectable()
export class CsrfService {
  readonly cookieName = CSRF_COOKIE;
  readonly headerName = CSRF_HEADER;

  issue(): { token: string; cookie: string } {
    const token = randomBytes(32).toString("hex");
    const cookie = `${CSRF_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=7200`;
    return { token, cookie };
  }

  /**
   * Development/local may omit Secure when Origin is http.
   */
  issueForOrigin(origin: string): { token: string; setCookie: string } {
    const token = randomBytes(32).toString("hex");
    const secure = origin.startsWith("https://") ? "; Secure" : "";
    const setCookie = `${CSRF_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=7200`;
    return { token, setCookie };
  }

  assertValid(headers: Record<string, string | string[] | undefined>, cookieHeader?: string): void {
    const headerRaw = headers[CSRF_HEADER] ?? headers["X-CSRF-Token"];
    const header = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    const cookieToken = this.readCookie(cookieHeader, CSRF_COOKIE);
    if (!header || !cookieToken || header.length < 16 || cookieToken.length < 16) {
      throw new HttpException(
        { code: "CSRF_REQUIRED", message: "Falta token CSRF válido." },
        HttpStatus.FORBIDDEN,
      );
    }
    const a = createHash("sha256").update(header).digest();
    const b = createHash("sha256").update(cookieToken).digest();
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new HttpException(
        { code: "CSRF_MISMATCH", message: "Token CSRF inválido." },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  assertTrustedOrigin(origin: string | undefined, allowed: string[]): void {
    if (!origin) {
      // Same-origin navigations may omit Origin on some GETs; mutating posts should send it.
      throw new HttpException(
        { code: "ORIGIN_REQUIRED", message: "Origen de solicitud no permitido." },
        HttpStatus.FORBIDDEN,
      );
    }
    if (!allowed.includes(origin)) {
      throw new HttpException(
        { code: "ORIGIN_FORBIDDEN", message: "Origen de solicitud no permitido." },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}
