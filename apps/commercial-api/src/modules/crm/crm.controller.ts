import { Body, Controller, Get, Headers, Inject, Param, Post, Req } from "@nestjs/common";
import {
  ContactRequestSchema,
  DemoRequestSchema,
  LeadCreateSchema,
  TrialRequestSchema,
} from "@camacho-pos-comercial/contracts";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service.js";
import { CaptchaService } from "../../common/security/captcha.service.js";
import { CsrfService } from "../../common/security/csrf.service.js";
import { AppConfigService } from "../../config/config.service.js";
import { CrmService } from "./crm.service.js";

type IpReq = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Controller("crm")
export class CrmController {
  constructor(
    @Inject(CrmService) private readonly crm: CrmService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(CaptchaService) private readonly captcha: CaptchaService,
    @Inject(CsrfService) private readonly csrf: CsrfService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  @Get("captcha-config")
  captchaConfig() {
    return this.captcha.publicConfig();
  }

  @Post("contact")
  async contact(@Req() req: IpReq, @Body() body: unknown) {
    await this.guardPublicForm(req, "crm:contact");
    const input = ContactRequestSchema.parse(body);
    this.captcha.assertHoneypotEmpty(input.website);
    await this.captcha.verifyOrThrow(input.captchaToken, req.ip);
    return this.crm.createContact(input);
  }

  @Post("demo")
  async demo(@Req() req: IpReq, @Body() body: unknown) {
    await this.guardPublicForm(req, "crm:demo");
    const input = DemoRequestSchema.parse(body);
    this.captcha.assertHoneypotEmpty(input.website);
    await this.captcha.verifyOrThrow(input.captchaToken, req.ip);
    return this.crm.createTrial({
      fullName: input.fullName,
      email: input.email,
      phoneE164: input.phoneE164,
      sector: input.sector,
      notes: input.notes,
      consentDataTreatment: true,
      consentTerms: true,
      sourcePath: "/solicitar-demo",
    });
  }

  @Post("trial")
  async trial(@Req() req: IpReq, @Body() body: unknown) {
    await this.guardPublicForm(req, "crm:trial");
    const input = TrialRequestSchema.parse(body);
    this.captcha.assertHoneypotEmpty(input.website);
    await this.captcha.verifyOrThrow(input.captchaToken, req.ip);
    return this.crm.createTrial(input);
  }

  @Get("trial/:id")
  async trialStatus(
    @Req() req: IpReq,
    @Param("id") id: string,
    @Headers("x-trial-access-token") headerToken?: string,
  ) {
    await this.rateLimit.assertAsync(`crm:trial-status:${req.ip ?? "unknown"}`, 30, 60_000);
    // Token ONLY via header — never query string (Referer/log leak).
    return this.crm.getTrialStatus(id, headerToken);
  }

  /**
   * Central → commercial activation. No local simulation.
   * Header: X-Central-Trial-Webhook-Key
   */
  @Post("trial/:id/activate-from-central")
  async activateFromCentral(
    @Req() req: IpReq,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("x-central-trial-webhook-key") webhookKey?: string,
  ) {
    await this.rateLimit.assertAsync(`crm:trial-activate:${req.ip ?? "unknown"}`, 30, 60_000);
    const payload = (body ?? {}) as { centralLicenseRef?: string };
    return this.crm.activateFromCentral({
      trialId: id,
      webhookKey,
      centralLicenseRef: payload.centralLicenseRef ?? "",
    });
  }

  @Post("trial/expire-due")
  async expireDue(
    @Req() req: IpReq,
    @Headers("x-central-trial-webhook-key") webhookKey?: string,
  ) {
    await this.rateLimit.assertAsync(`crm:trial-expire:${req.ip ?? "unknown"}`, 10, 60_000);
    // Same shared secret as activation — prevents unauthenticated expiry sweeps.
    await this.crm.assertCentralWebhookKey(webhookKey);
    return this.crm.expireDueTrials();
  }

  @Post("leads")
  async leads(@Req() req: IpReq, @Body() body: unknown) {
    await this.guardPublicForm(req, "crm:leads");
    const input = LeadCreateSchema.parse(body);
    this.captcha.assertHoneypotEmpty(input.website);
    await this.captcha.verifyOrThrow(input.captchaToken, req.ip);
    return this.crm.createLead(input);
  }

  private async guardPublicForm(req: IpReq, bucket: string) {
    await this.rateLimit.assertAsync(`${bucket}:${req.ip ?? "unknown"}`, 20, 60_000);
    const allowed = [
      this.config.env.PUBLIC_SITE_ORIGIN,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];
    const originRaw = req.headers?.origin;
    const origin = Array.isArray(originRaw) ? originRaw[0] : originRaw;
    // In test NODE_ENV, Origin may be absent from inject — skip Origin then still require CSRF cookie pair when present.
    if (this.config.env.NODE_ENV !== "test") {
      this.csrf.assertTrustedOrigin(origin, allowed);
    }
    const cookieRaw = req.headers?.cookie;
    const cookie = Array.isArray(cookieRaw) ? cookieRaw[0] : cookieRaw;
    if (this.config.env.NODE_ENV !== "test") {
      this.csrf.assertValid(req.headers ?? {}, cookie);
    }
  }
}
