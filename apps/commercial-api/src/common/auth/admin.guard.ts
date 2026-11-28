import { Inject, CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AppConfigService } from "../../config/config.service.js";
import { SessionBridgeService, type BridgedSession } from "./session-bridge.service.js";

export const ADMIN_TEST_FIXTURE_HEADER = "x-admin-test-fixture";
export const ADMIN_TEST_FIXTURE_VALUE = "GLOBAL_SUPERADMIN";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(SessionBridgeService) private readonly sessions: SessionBridgeService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      commercialSession?: BridgedSession;
    }>();

    const fixtureSession = this.tryTestFixture(request.headers);
    if (fixtureSession) {
      request.commercialSession = fixtureSession;
      return true;
    }

    const header = request.headers.authorization;
    const authorization = Array.isArray(header) ? header[0] : header;
    const session = await this.sessions.resolve(authorization);

    if (session.reason === "PENDING_CENTRAL_CREDENTIALS") {
      throw new UnauthorizedException({
        code: "PENDING_CENTRAL_CREDENTIALS",
        message: "Central authority origin/credentials are not configured. Admin routes fail closed.",
      });
    }

    if (!this.sessions.canManageCatalogPrices(session)) {
      throw new ForbiddenException({
        code: "ADMIN_FORBIDDEN",
        message: "Only Superadministrador GLOBAL can manage commercial catalog prices.",
      });
    }

    request.commercialSession = session;
    return true;
  }

  /**
   * OPTIONAL non-production fixture for staging UI demos.
   * Requires ALLOW_ADMIN_TEST_FIXTURE=1 AND NODE_ENV !== production
   * AND header X-Admin-Test-Fixture: GLOBAL_SUPERADMIN.
   * Never enabled by default; blocked in production by EnvSchema.
   */
  private tryTestFixture(
    headers: Record<string, string | string[] | undefined>,
  ): BridgedSession | null {
    if (this.config.isProduction) return null;
    if (!this.config.env.ALLOW_ADMIN_TEST_FIXTURE) return null;

    const raw = headers[ADMIN_TEST_FIXTURE_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== ADMIN_TEST_FIXTURE_VALUE) return null;

    return {
      authenticated: true,
      role: "SUPERADMIN_GLOBAL",
      subjectId: "fixture-GLOBAL_SUPERADMIN",
      tenantId: "global",
      reason: "ADMIN_TEST_FIXTURE",
    };
  }
}
