import { Inject, Controller, Get, Param, Post } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";
import { PaymentsService } from "./payments.service.js";
import { AppConfigService } from "../../config/config.service.js";

@Controller("payments")
export class PaymentsController {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
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

  /** DEV/SANDBOX only — simulates provider webhook. Disabled in production. */
  @Post(":referenceCode/sandbox-simulate-paid")
  sandboxSimulate(@Param("referenceCode") referenceCode: string) {
    if (this.config.isProduction) {
      return { error: "SANDBOX_ONLY" };
    }
    return this.payments.sandboxSimulatePaid(referenceCode);
  }
}
