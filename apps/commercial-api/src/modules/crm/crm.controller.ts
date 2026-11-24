import { Inject, Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import {
  ContactRequestSchema,
  DemoRequestSchema,
  LeadCreateSchema,
  TrialRequestSchema,
} from "@camacho-pos-comercial/contracts";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service.js";
import { CaptchaService } from "../../common/security/captcha.service.js";
import { CrmService } from "./crm.service.js";

type IpReq = { ip?: string };

@Controller("crm")
export class CrmController {
  constructor(
    @Inject(CrmService) private readonly crm: CrmService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(CaptchaService) private readonly captcha: CaptchaService,
  ) {}

  @Get("captcha-config")
  captchaConfig() {
    return this.captcha.publicConfig();
  }

  @Post("contact")
  async contact(@Req() req: IpReq, @Body() body: unknown) {
    this.guardPublicForm(req, "crm:contact");
    const input = ContactRequestSchema.parse(body);
    this.captcha.assertHoneypotEmpty(input.website);
    await this.captcha.verifyOrThrow(input.captchaToken, req.ip);
    return this.crm.createContact(input);
  }

  @Post("demo")
  async demo(@Req() req: IpReq, @Body() body: unknown) {
    this.guardPublicForm(req, "crm:demo");
    const input = DemoRequestSchema.parse(body);
    this.captcha.assertHoneypotEmpty(input.website);
    await this.captcha.verifyOrThrow(input.captchaToken, req.ip);
    // Legacy demo endpoint now creates a 5-day trial enrollment.
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
    this.guardPublicForm(req, "crm:trial");
    const input = TrialRequestSchema.parse(body);
    this.captcha.assertHoneypotEmpty(input.website);
    await this.captcha.verifyOrThrow(input.captchaToken, req.ip);
    return this.crm.createTrial(input);
  }

  @Get("trial/:id")
  trialStatus(@Req() req: IpReq, @Param("id") id: string) {
    this.rateLimit.assert(`crm:trial-status:${req.ip ?? "unknown"}`, 60, 60_000);
    return this.crm.getTrialStatus(id);
  }

  @Post("leads")
  async leads(@Req() req: IpReq, @Body() body: unknown) {
    this.guardPublicForm(req, "crm:leads");
    const input = LeadCreateSchema.parse(body);
    this.captcha.assertHoneypotEmpty(input.website);
    await this.captcha.verifyOrThrow(input.captchaToken, req.ip);
    return this.crm.createLead(input);
  }

  private guardPublicForm(req: IpReq, bucket: string) {
    this.rateLimit.assert(`${bucket}:${req.ip ?? "unknown"}`, 20, 60_000);
  }
}
