import { Inject, CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { SessionBridgeService } from "./session-bridge.service.js";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(SessionBridgeService) private readonly sessions: SessionBridgeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      commercialSession?: unknown;
    }>();
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
}
