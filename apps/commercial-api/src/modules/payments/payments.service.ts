import {
  BadRequestException,
  ConflictException,
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
              gate: collection.gate,
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
   * Idempotent. Verify amount + reference (timing-safe key compare).
   * Key must arrive via Authorization Bearer or X-Factus-Pay-Webhook-Key
   * (query ?key= only if FACTUS_PAY_WEBHOOK_ALLOW_QUERY_KEY — deprecated).
   * Never mark paid from frontend alone.
   * Real paid → may enqueue Central provisioning (stays PAID+PENDING when Central down).
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

    const result = await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.payment.findUnique({
        where: { referenceCode },
        select: { id: true, orderId: true },
      });
      if (candidate) {
        await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${candidate.orderId} FOR UPDATE`;
      }
      const payment = candidate && await tx.payment.findUnique({ where: { id: candidate.id }, include: { order: true } });
      const mode = this.config.env.FACTUS_PAY_MODE;
      if (payment && (payment.provider !== "FACTUS_PAY" || payment.environment !== mode)) {
        return { kind: "SOURCE_MISMATCH" as const };
      }
      const event = {
        idempotencyKey,
        provider: "FACTUS_PAY" as const,
        environment: mode,
        referenceCode,
        amountCents,
        rawPayload: parsed as object,
        processedAt: new Date(),
      };
      if (!payment) {
        const stored = await tx.paymentEvent.createMany({
          data: [{ ...event, eventType: "collection.paid.orphan" }],
          skipDuplicates: true,
        });
        return { kind: stored.count === 1 ? "NOT_FOUND" as const : "DUPLICATE" as const };
      }

      const existingEvent = await tx.paymentEvent.findUnique({ where: { idempotencyKey } });
      if (existingEvent && existingEvent.eventType !== "collection.paid.orphan") {
        // Recover orders stranded by the previous non-atomic payment-to-outbox transition.
        if (existingEvent.paymentId === payment.id && existingEvent.eventType === "collection.paid" &&
            payment.status === "PAID" && payment.order.status === "PAID") {
          await this.provisioning.enqueueForPaidOrder(payment.orderId, tx);
        }
        return { kind: "DUPLICATE" as const };
      }
      const marker = { ...event, paymentId: payment.id };
      const storeEvent = async (eventType: string) => {
        if (existingEvent) {
          await tx.paymentEvent.update({ where: { idempotencyKey }, data: { ...marker, eventType } });
        } else {
          await tx.paymentEvent.create({ data: { ...marker, eventType } });
        }
      };
      if (payment.amountCents !== amountCents) {
        await storeEvent("collection.paid.mismatch");
        return { kind: "AMOUNT_MISMATCH" as const, expected: payment.amountCents };
      }
      if (payment.order.status !== "PENDING_PAYMENT" || payment.order.deletedAt !== null ||
          !["PENDING", "REQUIRES_ACTION", "AUTHORIZED"].includes(payment.status)) {
        await storeEvent("collection.paid.requires_review");
        return { kind: "REQUIRES_REVIEW" as const };
      }

      const affected = await tx.payment.updateMany({
        where: { id: payment.id, status: payment.status },
        data: { status: "PAID", paidAt: event.processedAt },
      });
      if (affected.count !== 1) throw new ConflictException({ code: "PAYMENT_STATUS_CHANGED" });
      await storeEvent("collection.paid");
      await tx.paymentAttempt.create({ data: { paymentId: payment.id, status: "SUCCEEDED" } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID", paidAt: event.processedAt } });
      if (payment.order.cartId) {
        await tx.cart.update({ where: { id: payment.order.cartId }, data: { status: "CONVERTED" } });
      }
      await this.provisioning.enqueueForPaidOrder(payment.orderId, tx);
      await this.audit.record({
        actorType: "WEBHOOK",
        action: "PAYMENT_MARKED_PAID",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { referenceCode, amountCents },
      }, tx);
      return { kind: "STORED" as const };
    });
    if (result.kind === "SOURCE_MISMATCH") {
      throw new BadRequestException({ code: "FACTUS_PAY_SOURCE_MISMATCH" });
    }
    if (result.kind === "AMOUNT_MISMATCH") {
      throw new BadRequestException({ code: "FACTUS_PAY_AMOUNT_MISMATCH", expected: result.expected, received: amountCents });
    }
    if (result.kind === "REQUIRES_REVIEW") {
      throw new ConflictException({ code: "FACTUS_PAY_RECONCILIATION_REQUIRED" });
    }
    return { result: result.kind };
  }

  /**
   * Sandbox/MOCK-only reconcile helper for tests and local demos.
   * Marks PAID via the same amount/reference checks as webhook, but MUST NOT
   * enqueue real license provisioning to Central (no outbox send / no fetch).
   */
  async sandboxSimulatePaid(referenceCode: string) {
    if (this.config.isProduction) {
      throw new BadRequestException({ code: "SANDBOX_ONLY" });
    }

    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { referenceCode },
      include: { order: true },
    });

    const amountCents = payment.amountCents;
    const idempotencyKey = createHash("sha256")
      .update(`sandbox-simulate:${referenceCode}:${amountCents}:paid`)
      .digest("hex");

    const existingEvent = await this.prisma.paymentEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existingEvent) {
      return { result: "DUPLICATE" as WebhookProcessResult, provisionedToCentral: false };
    }

    const wasUnpaid = payment.status !== "PAID";

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          idempotencyKey,
          provider: payment.provider,
          environment: payment.environment,
          eventType: "collection.paid.sandbox_simulate",
          referenceCode,
          amountCents,
          rawPayload: {
            source: "SANDBOX_SIMULATE",
            note: "Does not trigger Central license provisioning",
          },
          processedAt: new Date(),
        },
      });

      if (wasUnpaid) {
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

    if (wasUnpaid) {
      await this.audit.record({
        actorType: "SYSTEM",
        action: "SANDBOX_SIMULATE_PAID_NO_CENTRAL_PROVISION",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { referenceCode, amountCents, provisionedToCentral: false },
      });
    }

    // Explicit: never call provisioning.enqueueForPaidOrder / never fetch Central.
    return { result: "STORED" as WebhookProcessResult, provisionedToCentral: false };
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
