import { Controller, Get, Header, Req, Res } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { CsrfService } from "./csrf.service.js";
import { AppConfigService } from "../../config/config.service.js";

@Controller("security")
export class SecurityController {
  constructor(
    @Inject(CsrfService) private readonly csrf: CsrfService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  @Get("csrf")
  @Header("Cache-Control", "no-store")
  issueCsrf(@Req() req: { headers?: Record<string, string | string[] | undefined> }, @Res({ passthrough: true }) res: { header: (k: string, v: string) => void }) {
    const originHeader = req.headers?.origin;
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
    const issued = this.csrf.issueForOrigin(origin || this.config.env.PUBLIC_SITE_ORIGIN);
    res.header("Set-Cookie", issued.setCookie);
    return { csrfToken: issued.token, headerName: this.csrf.headerName };
  }

  @Get("headers-check")
  headersCheck() {
    return {
      csrf: true,
      captcha: true,
      durableRateLimit: this.config.env.RATE_LIMIT_DURABLE,
      note: "Edge CSP/HSTS expected at Cloudflare — see docs/security/cloudflare-edge.md",
    };
  }
}
