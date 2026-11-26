import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";
import { AuditService } from "../audit/audit.service.js";

const retryableStatuses = ["PENDING", "QUEUED", "FAILED"] as const;

// Central CommercialProvisioningResponseSchema wire contract.
const centralResponse = z.object({
  status: z.enum(["ACCEPTED", "DUPLICATE"]),
  provisioningId: z.string().min(8),
  idempotencyKey: z.string().min(8),
  licenseUnits: z.number().int().positive(),
  cajaRule: z.literal("ONE_LICENSE_ONE_CAJA"),
  fulfillment: z.enum(["QUEUED", "ISSUED", "ALREADY_QUEUED", "ALREADY_ISSUED"]),
  licenseIds: z.array(z.string().uuid()).max(10_000),
}).strict();

/**
 * ProvisioningRequest outbox → Central license issuance.
 *
 * Idempotent by orderId hash. When Central is unavailable:
 * - Order remains PAID
 * - ProvisioningRequest stays PENDING (PAID + PENDING_PROVISION)
 * - Retries are stubbed via processDue + nextRetryAt backoff (documented)
 *
 * Central path today: `${CENTRAL_AUTHORITY_ORIGIN}${CENTRAL_PROVISIONING_PATH}`
 * (default `/v1/commercial/provisioning`) — not yet a published Central route.
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async enqueueForPaidOrder(orderId: string, tx: Prisma.TransactionClient) {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
        businessProfile: true,
      },
    });

    const idempotencyKey = createHash("sha256").update(`provision:${orderId}`).digest("hex");
    const existing = await tx.provisioningRequest.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return existing;

    const licenseUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
    // Top-level planId when all line items share one Central plan UUID.
    // tenantId is supplied only when Central tenancy binding exists on the payload path
    // (QUEUED until both tenantId+planId are present for ISSUED fulfillment).
    const planIds = [
      ...new Set(order.items.map((item) => item.planId).filter((id): id is string => Boolean(id))),
    ];
    const planId = planIds.length === 1 ? planIds[0] : undefined;

    const payload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email,
      businessProfileId: order.businessProfileId,
      licenseUnits,
      cajaRule: "ONE_LICENSE_ONE_CAJA",
      ...(planId ? { planId } : {}),
      items: order.items.map((item) => ({
        label: item.label,
        quantity: item.quantity,
        planId: item.planId,
        kitId: item.kitId,
        priceVersion: item.priceVersion,
        unitAmountCents: item.unitAmountCents,
      })),
    };

    const origin = this.config.centralOrigin();
    const request = await tx.provisioningRequest.create({
      data: {
        orderId,
        // PENDING when Central missing → order stays PAID (PAID + PENDING_PROVISION).
        // QUEUED when Central origin present → worker may attempt send.
        status: origin ? "QUEUED" : "PENDING",
        idempotencyKey,
        payload,
        lastError: origin ? null : "PENDING_CENTRAL_CREDENTIALS",
        nextRetryAt: new Date(Date.now() + (origin ? 0 : 60_000)),
      },
    });

    if (origin) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PROVISIONING" },
      });
    }
    // else: leave Order.status = PAID (PAID + PENDING_PROVISION)

    await this.audit.record({
      actorType: "SYSTEM",
      action: origin ? "PROVISIONING_ENQUEUED" : "PROVISIONING_PENDING_CENTRAL",
      entityType: "ProvisioningRequest",
      entityId: request.id,
      metadata: {
        orderId,
        licenseUnits,
        orderStatus: origin ? "PROVISIONING" : "PAID",
        provisioningStatus: request.status,
      },
    }, tx);

    return request;
  }

  /**
   * Retry stub: claim due PENDING/QUEUED/FAILED rows and attempt Central POST.
   * Exponential-ish backoff capped at 60 minutes. No silent success.
   */
  async processDue(limit = 20) {
    const due = await this.prisma.provisioningRequest.findMany({
      where: {
        status: { in: [...retryableStatuses] },
        order: { status: { in: ["PAID", "PROVISIONING"] } },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    const results: Array<{ id: string; status: string }> = [];
    for (const item of due) {
      results.push(await this.attemptSend(item.id));
    }
    return results;
  }

  private async attemptSend(id: string) {
    const item = await this.prisma.provisioningRequest.findUniqueOrThrow({ where: { id } });
    const persist = async (data: Prisma.ProvisioningRequestUpdateManyMutationInput) => {
      const result = await this.prisma.provisioningRequest.updateMany({
        where: {
          id,
          attemptCount: item.attemptCount,
          status: { in: [...retryableStatuses] },
          order: { status: { in: ["PAID", "PROVISIONING"] } },
        },
        data: { ...data, attemptCount: { increment: 1 } },
      });
      return result.count === 1;
    };
    const nextRetryAt = new Date(Date.now() + 60_000 * Math.min(60, item.attemptCount + 1));
    const origin = this.config.centralOrigin();
    const bridgeKey = this.config.env.COMMERCIAL_BRIDGE_KEY?.trim() ?? "";
    if (!origin || bridgeKey.length < 32) {
      const lastError = origin ? "PENDING_COMMERCIAL_BRIDGE_KEY" : "PENDING_CENTRAL_CREDENTIALS";
      const saved = await persist({ status: "PENDING", lastError, nextRetryAt });
      if (saved) this.logger.warn(`Provisioning ${id} deferred: ${lastError}`);
      return { id, status: saved ? "PENDING" : "UNCHANGED" };
    }

    const path = this.config.env.CENTRAL_PROVISIONING_PATH || "/v1/commercial/provisioning";
    try {
      const response = await fetch(`${origin}${path}`, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          "idempotency-key": item.idempotencyKey,
          "x-central-commercial-bridge-key": bridgeKey,
        },
        body: JSON.stringify(item.payload),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        throw new Error(`CENTRAL_HTTP_${response.status}`);
      }
      const parsed = centralResponse.safeParse(await response.json());
      if (!parsed.success) throw new Error("CENTRAL_PROVISIONING_RESPONSE_INVALID");
      const body = parsed.data;
      const payload = item.payload as Record<string, unknown>;
      if (body.idempotencyKey !== item.idempotencyKey || body.licenseUnits !== payload.licenseUnits) {
        throw new Error("CENTRAL_PROVISIONING_ORDER_MISMATCH");
      }
      const issued = body.fulfillment === "ISSUED" || body.fulfillment === "ALREADY_ISSUED";
      const uniqueLicenseIds = new Set(body.licenseIds.map((id) => id.toLowerCase()));
      if (issued ? uniqueLicenseIds.size !== body.licenseUnits || body.licenseIds.length !== body.licenseUnits
        : body.licenseIds.length !== 0) {
        throw new Error("CENTRAL_PROVISIONING_LICENSE_COUNT_MISMATCH");
      }

      // Central's issuance response attests license creation only. Order completion
      // needs a separate activation acknowledgment from the licensing authority.
      const saved = await persist({
        status: issued ? "SENT" : "QUEUED",
        lastError: issued ? null : `CENTRAL_FULFILLMENT_${body.fulfillment}`,
        nextRetryAt: issued ? null : nextRetryAt,
        acknowledgedAt: new Date(),
        ...(issued ? {
          payload: {
            ...(item.payload as Prisma.InputJsonObject),
            centralLicenseIds: body.licenseIds,
            centralProvisioningId: body.provisioningId,
          },
        } : {}),
      });
      if (!saved) return { id, status: "UNCHANGED" };
      return { id, status: issued ? "SENT" : "QUEUED", fulfillment: body.fulfillment, licenseIds: body.licenseIds };
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN";
      const saved = await persist({ status: "FAILED", lastError: message, nextRetryAt });
      return { id, status: saved ? "FAILED" : "UNCHANGED" };
    }
  }
}
