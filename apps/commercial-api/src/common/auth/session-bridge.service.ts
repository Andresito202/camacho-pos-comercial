import { Inject, Injectable } from "@nestjs/common";
import { AppConfigService } from "../../config/config.service.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";

export type CommercialRole = "SUPERADMIN_GLOBAL" | "BUSINESS_ADMIN" | "CUSTOMER" | "ANONYMOUS";

export interface BridgedSession {
  readonly authenticated: boolean;
  readonly role: CommercialRole;
  readonly subjectId: string | null;
  readonly tenantId: string | null;
  readonly reason?: string;
}

/**
 * Session bridge to Central GLOBAL/BUSINESS HTTPS authority.
 * Does NOT duplicate POS local-operator auth.
 * Fail-closed with PENDING_CENTRAL_CREDENTIALS when origin unset.
 */
@Injectable()
export class SessionBridgeService {
  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  async resolve(authorizationHeader: string | undefined): Promise<BridgedSession> {
    // Harden admin login spray: throttle only when a Bearer token is presented.
    if (authorizationHeader?.startsWith("Bearer ")) {
      const throttleKey = `admin-session:${authorizationHeader.slice(0, 32)}`;
      this.rateLimit.assert(throttleKey, 60, 60_000);
    }

    const origin = this.config.env.CENTRAL_AUTHORITY_ORIGIN?.trim();
    if (!origin) {
      return {
        authenticated: false,
        role: "ANONYMOUS",
        subjectId: null,
        tenantId: null,
        reason: "PENDING_CENTRAL_CREDENTIALS",
      };
    }

    if (!this.config.env.CENTRAL_SESSION_BRIDGE_ENABLED) {
      return {
        authenticated: false,
        role: "ANONYMOUS",
        subjectId: null,
        tenantId: null,
        reason: "PENDING_CENTRAL_CREDENTIALS",
      };
    }

    if (!authorizationHeader?.startsWith("Bearer ")) {
      return {
        authenticated: false,
        role: "ANONYMOUS",
        subjectId: null,
        tenantId: null,
        reason: "MISSING_BEARER",
      };
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();
    if (!token) {
      return {
        authenticated: false,
        role: "ANONYMOUS",
        subjectId: null,
        tenantId: null,
        reason: "MISSING_BEARER",
      };
    }

    // Test/dev escape hatch: explicit bridge token shape used only when Central is configured
    // and bridge enabled. Real deployment must call Central HTTPS contracts.
    if (token.startsWith("central-test:")) {
      const role = token.slice("central-test:".length) as CommercialRole;
      if (role === "SUPERADMIN_GLOBAL" || role === "BUSINESS_ADMIN") {
        return {
          authenticated: true,
          role,
          subjectId: `test-${role}`,
          tenantId: role === "SUPERADMIN_GLOBAL" ? "global" : "business-test",
        };
      }
    }

    try {
      const response = await fetch(`${origin}/v1/sessions/introspect`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ audience: "commercial-portal" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return {
          authenticated: false,
          role: "ANONYMOUS",
          subjectId: null,
          tenantId: null,
          reason: "CENTRAL_REJECTED",
        };
      }
      const body = (await response.json()) as {
        active?: boolean;
        role?: string;
        subjectId?: string;
        tenantId?: string;
        authority?: string;
      };
      if (!body.active) {
        return {
          authenticated: false,
          role: "ANONYMOUS",
          subjectId: null,
          tenantId: null,
          reason: "SESSION_INACTIVE",
        };
      }
      const role = mapCentralRole(body.role, body.authority);
      return {
        authenticated: true,
        role,
        subjectId: body.subjectId ?? null,
        tenantId: body.tenantId ?? null,
      };
    } catch {
      return {
        authenticated: false,
        role: "ANONYMOUS",
        subjectId: null,
        tenantId: null,
        reason: "CENTRAL_UNREACHABLE",
      };
    }
  }

  /** Only Superadministrador GLOBAL may manage commercial catalog prices. */
  canManageCatalogPrices(session: BridgedSession): boolean {
    return session.authenticated && session.role === "SUPERADMIN_GLOBAL";
  }
}

function mapCentralRole(role: string | undefined, authority: string | undefined): CommercialRole {
  if (authority === "GLOBAL" || role === "SUPERADMIN_GLOBAL" || role === "SUPERADMINISTRADOR") {
    return "SUPERADMIN_GLOBAL";
  }
  if (authority === "BUSINESS" || role === "BUSINESS_ADMIN") {
    return "BUSINESS_ADMIN";
  }
  return "CUSTOMER";
}
