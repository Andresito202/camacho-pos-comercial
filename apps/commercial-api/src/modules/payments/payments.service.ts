import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import {
  FactusPayWebhookBodySchema,
  factusAmountToCents,
  type WebhookProcessResult,
} from "@camacho-pos-comercial/contracts";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";
import { FactusPayAdapter } from "./factus-pay.adapter.js";
import { ProvisioningService } from "../provisioning/provisioning.service.js";
import { AuditService } from "../audit/audit.service.js";

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(FactusPayAdapter) private readonly factus: FactusPayAdapter,
    @Inject(ProvisioningService) private readonly provisioning: ProvisioningService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createCollectionForOrder(input: {
    orderId: string;
    customerId: string;
    amountCents: number;
  }) {
    const referenceCode = `CPC-PAY-${randomBytes(12).toString("hex")}`;
    const collection = await this.factus.createCollection({
      referenceCode,
      amountCents: input.amountCents,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: input.orderId,
        customerId: input.customerId,
        provider: collection.provider,
        environment: collection.environment,
        status: "PENDING",
        amountCents: input.amountCents,
        referenceCode,
        qrPayload: collection.qrPayload,
        attempts: {
          create: {
            status: "SUBMITTED",
            providerPayload: {
              mock: collection.mock,
              status: collection.status,
              label: collection.mock ? "SANDBOX_MOCK_LABELED" : "PROVIDER",
            },
          },
        },
      },
    });

    return payment;
  }

  /**
   * Webhook: POST /v1/webhooks/factus-pay/collections
   * Idempotent. Verify amount + reference. Never mark paid from frontend alone.
   */
  async handleFactusPayWebhook(input: {
    body: unknown;
    suppliedKey: string | null;
  }): Promise<{ result: WebhookProcessResult }> {
    const expected = this.config.webhookKey();
    if (!expected || expected.length < 32) {
      throw new UnauthorizedException({ code: "FACTUS_PAY_WEBHOOK_KEY_NOT_CONFIGURED" });
    }
    if (!input.suppliedKey || !constantTimeEqual(input.suppliedKey, expected)) {
      throw new UnauthorizedException({ code: "FACTUS_PAY_UNAUTHORIZED" });
    }

    const parsed = FactusPayWebhookBodySchema.parse(input.body);
    const referenceCode = parsed.data.reference_code;
    const amountCents = factusAmountToCents(parsed.data.amount);
    const idempotencyKey = createHash("sha256")
      .update(`factus-pay:${referenceCode}:${amountCents}:${parsed.data.status}`)
      .digest("hex");

    const existingEvent = await this.prisma.paymentEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existingEvent) {
      return { result: "DUPLICATE" };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { referenceCode },
      include: { order: true },
    });
    if (!payment) {
      await this.prisma.paymentEvent.create({
        data: {
          idempotencyKey,
          provider: "FACTUS_PAY",
          environment: this.config.env.FACTUS_PAY_MODE,
          eventType: "collection.paid.orphan",
          referenceCode,
          amountCents,
          rawPayload: parsed as object,
          processedAt: new Date(),
        },
      });
      return { result: "NOT_FOUND" };
    }

    if (payment.amountCents !== amountCents) {
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          idempotencyKey,
          provider: payment.provider,
          environment: payment.environment,
          eventType: "collection.paid.mismatch",
          referenceCode,
          amountCents,
          rawPayload: parsed as object,
          processedAt: new Date(),
        },
      });
      throw new BadRequestException({
        code: "FACTUS_PAY_AMOUNT_MISMATCH",
        expected: payment.amountCents,
        received: amountCents,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          idempotencyKey,
          provider: payment.provider,
          environment: payment.environment,
          eventType: "collection.paid",
          referenceCode,
          amountCents,
          rawPayload: parsed as object,
          processedAt: new Date(),
        },
      });

      if (payment.status !== "PAID") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "PAID", paidAt: new Date() },
        });
        await tx.paymentAttempt.create({
          data: { paymentId: payment.id, status: "SUCCEEDED" },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "PAID", paidAt: new Date() },
        });
        if (payment.order.cartId) {
          await tx.cart.update({
            where: { id: payment.order.cartId },
            data: { status: "CONVERTED" },
          });
        }
      }
    });

    if (payment.status !== "PAID") {
      await this.provisioning.enqueueForPaidOrder(payment.orderId);
      await this.audit.record({
        actorType: "WEBHOOK",
        action: "PAYMENT_MARKED_PAID",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { referenceCode, amountCents },
      });
    }

    return { result: "STORED" };
  }

  /** Sandbox-only reconcile helper for tests — never trusts frontend paid claims. */
  async sandboxSimulatePaid(referenceCode: string) {
    if (this.config.isProduction) {
      throw new BadRequestException({ code: "SANDBOX_ONLY" });
    }
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { referenceCode },
    });
    return this.handleFactusPayWebhook({
      suppliedKey: this.config.webhookKey(),
      body: {
        data: {
          reference_code: referenceCode,
          amount: payment.amountCents,
          status: "paid",
        },
      },
    });
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
