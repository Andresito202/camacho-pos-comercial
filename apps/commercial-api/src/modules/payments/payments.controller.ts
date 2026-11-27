import { ForbiddenException, Inject, Controller, Get, Param, Post, Req } from "@nestjs/common";
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
        order: {
          select: {
            status: true, deletedAt: true,
            items: { where: { planPriceId: { not: null } }, select: { id: true }, take: 1 },
            provisioning: {
              orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1,
              select: { status: true, lastError: true, wirePreparedAt: true, attemptCount: true, acknowledgedAt: true },
            },
          },
        },
      },
    });
    const { order, ...publicPayment } = payment;
    let commercialStatus: "WAITING_BINDING" | "QUEUED" | "PENDING_ACTIVATION" | "REQUIRES_REVIEW" | null = null;
    if (payment.provider === "FACTUS_PAY" && payment.status === "PAID" && payment.paidAt &&
        !order.deletedAt && ["PAID", "PROVISIONING", "FULFILLED"].includes(order.status) && order.items.length > 0) {
      const request = order.provisioning[0];
      if (!request) commercialStatus = "REQUIRES_REVIEW";
      else if (request.status === "SENT" && request.wirePreparedAt !== null) commercialStatus = "PENDING_ACTIVATION";
      else if (["FAILED", "CANCELLED", "ACKNOWLEDGED", "SENT"].includes(request.status) ||
          request.lastError === "PROVISION_PRODUCTION_NOT_CERTIFIED" ||
          (!request.wirePreparedAt && (request.attemptCount > 0 || request.acknowledgedAt !== null))) {
        commercialStatus = "REQUIRES_REVIEW";
      } else {
        commercialStatus = request.wirePreparedAt ? "QUEUED" : "WAITING_BINDING";
      }
    }
    return { ...publicPayment, commercialStatus };
  }

  /**
   * DEV/SANDBOX/MOCK only — simulates provider paid confirmation.
   * Does NOT enqueue Central license provisioning. Disabled in production.
   */
  @Post(":referenceCode/sandbox-simulate-paid")
  sandboxSimulate(@Param("referenceCode") referenceCode: string, @Req() req: { ip?: string }) {
    this.rateLimit.assert(`sandbox-simulate:${req.ip ?? "unknown"}`, 20, 60_000);
    if (this.config.isProduction) {
      throw new ForbiddenException({ code: "SANDBOX_ONLY" });
    }
    return this.payments.sandboxSimulatePaid(referenceCode);
  }
}
