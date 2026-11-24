import { Inject, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service.js";
import { PaymentsService } from "./payments.service.js";
import { AppConfigService } from "../../config/config.service.js";

@Controller("payments")
export class PaymentsController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Get(":referenceCode")
  async get(@Param("referenceCode") referenceCode: string) {
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { referenceCode },
      select: {
        referenceCode: true,
        status: true,
        amountCents: true,
        currencyCode: true,
        environment: true,
        provider: true,
        qrPayload: true,
        paidAt: true,
      },
    });
    return payment;
  }

  /**
   * DEV/SANDBOX/MOCK only — simulates provider paid confirmation.
   * Does NOT enqueue Central license provisioning. Disabled in production.
   */
  @Post(":referenceCode/sandbox-simulate-paid")
  sandboxSimulate(@Param("referenceCode") referenceCode: string, @Req() req: { ip?: string }) {
    this.rateLimit.assert(`sandbox-simulate:${req.ip ?? "unknown"}`, 20, 60_000);
    if (this.config.isProduction) {
      return { error: "SANDBOX_ONLY" };
    }
    return this.payments.sandboxSimulatePaid(referenceCode);
  }
}
