import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";
import { AuditService } from "../audit/audit.service.js";

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
        status: { in: ["PENDING", "QUEUED", "FAILED"] },
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
    const origin = this.config.centralOrigin();

    if (!origin) {
      // Stay PENDING — order remains PAID. Documented retry stub: bump nextRetryAt only.
      await this.prisma.provisioningRequest.update({
        where: { id },
        data: {
          status: "PENDING",
          lastError: "PENDING_CENTRAL_CREDENTIALS",
          attemptCount: item.attemptCount + 1,
          nextRetryAt: new Date(Date.now() + 60_000 * Math.min(60, item.attemptCount + 1)),
        },
      });
      this.logger.warn(`Provisioning ${id} deferred: PENDING_CENTRAL_CREDENTIALS (order stays PAID)`);
      return { id, status: "PENDING" };
    }

    const path = this.config.env.CENTRAL_PROVISIONING_PATH || "/v1/commercial/provisioning";
    const bridgeKey = this.config.env.COMMERCIAL_BRIDGE_KEY?.trim() ?? "";
    if (!bridgeKey || bridgeKey.length < 32) {
      await this.prisma.provisioningRequest.update({
        where: { id },
        data: {
          status: "PENDING",
          lastError: "PENDING_COMMERCIAL_BRIDGE_KEY",
          attemptCount: item.attemptCount + 1,
          nextRetryAt: new Date(Date.now() + 60_000 * Math.min(60, item.attemptCount + 1)),
        },
      });
      this.logger.warn(`Provisioning ${id} deferred: PENDING_COMMERCIAL_BRIDGE_KEY`);
      return { id, status: "PENDING" };
    }

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
      const body = (await response.json()) as {
        status?: string;
        fulfillment?: string;
        provisioningId?: string;
        licenseIds?: string[];
      };
      if (body.status !== "ACCEPTED" && body.status !== "DUPLICATE") {
        throw new Error(`CENTRAL_PROVISIONING_STATUS_${body.status ?? "UNKNOWN"}`);
      }
      const issued =
        body.fulfillment === "ISSUED" || body.fulfillment === "ALREADY_ISSUED";
      const licenseIds = Array.isArray(body.licenseIds) ? body.licenseIds : [];
      // Queue ack alone must not mark the commercial order FULFILLED — need real licenseIds.
      if (issued && licenseIds.length === 0) {
        throw new Error("CENTRAL_ISSUED_WITHOUT_LICENSE_IDS");
      }
      await this.prisma.provisioningRequest.update({
        where: { id },
        data: {
          status: issued ? "SENT" : "QUEUED",
          attemptCount: item.attemptCount + 1,
          lastError: issued
            ? null
            : `CENTRAL_FULFILLMENT_${body.fulfillment ?? "QUEUED"}`,
          acknowledgedAt: new Date(),
          ...(issued
            ? {
                payload: {
                  ...(item.payload as Record<string, unknown>),
                  centralLicenseIds: licenseIds,
                  centralProvisioningId: body.provisioningId,
                },
              }
            : {}),
        },
      });
      if (issued) {
        await this.prisma.order.update({
          where: { id: item.orderId },
          data: { status: "FULFILLED" },
        });
      }
      return { id, status: issued ? "SENT" : "QUEUED", fulfillment: body.fulfillment, licenseIds };
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN";
      await this.prisma.provisioningRequest.update({
        where: { id },
        data: {
          status: "FAILED",
          lastError: message,
          attemptCount: item.attemptCount + 1,
          nextRetryAt: new Date(Date.now() + 60_000 * Math.min(60, item.attemptCount + 1)),
        },
      });
      // Order may already be PROVISIONING; leave it — do not silently mark FULFILLED.
      return { id, status: "FAILED" };
    }
  }
}
