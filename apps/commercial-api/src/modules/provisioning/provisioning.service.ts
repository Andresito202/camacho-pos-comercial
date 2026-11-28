import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";
import { AuditService } from "../audit/audit.service.js";

/**
 * Outbox to Central for license provisioning.
 * Idempotent. Retries with nextRetryAt. Fail-closed when Central origin missing.
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async enqueueForPaidOrder(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
        businessProfile: true,
      },
    });

    const idempotencyKey = createHash("sha256").update(`provision:${orderId}`).digest("hex");
    const existing = await this.prisma.provisioningRequest.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return existing;

    const licenseUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const payload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email,
      businessProfileId: order.businessProfileId,
      licenseUnits,
      cajaRule: "ONE_LICENSE_ONE_CAJA",
      items: order.items.map((item) => ({
        label: item.label,
        quantity: item.quantity,
        planId: item.planId,
        kitId: item.kitId,
        priceVersion: item.priceVersion,
        unitAmountCents: item.unitAmountCents,
      })),
    };

    const request = await this.prisma.provisioningRequest.create({
      data: {
        orderId,
        status: "QUEUED",
        idempotencyKey,
        payload,
        nextRetryAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "PROVISIONING" },
    });

    await this.audit.record({
      actorType: "SYSTEM",
      action: "PROVISIONING_ENQUEUED",
      entityType: "ProvisioningRequest",
      entityId: request.id,
      metadata: { orderId, licenseUnits },
    });

    return request;
  }

  async processDue(limit = 20) {
    const due = await this.prisma.provisioningRequest.findMany({
      where: {
        status: { in: ["QUEUED", "FAILED"] },
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
    const origin = this.config.env.CENTRAL_AUTHORITY_ORIGIN?.trim();

    if (!origin) {
      await this.prisma.provisioningRequest.update({
        where: { id },
        data: {
          status: "FAILED",
          lastError: "PENDING_CENTRAL_CREDENTIALS",
          attemptCount: item.attemptCount + 1,
          nextRetryAt: new Date(Date.now() + 60_000 * Math.min(60, item.attemptCount + 1)),
        },
      });
      this.logger.warn(`Provisioning ${id} blocked: PENDING_CENTRAL_CREDENTIALS`);
      return { id, status: "FAILED" };
    }

    try {
      const response = await fetch(`${origin}/v1/commercial/provisioning`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": item.idempotencyKey,
        },
        body: JSON.stringify(item.payload),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        throw new Error(`CENTRAL_HTTP_${response.status}`);
      }
      await this.prisma.provisioningRequest.update({
        where: { id },
        data: {
          status: "SENT",
          attemptCount: item.attemptCount + 1,
          lastError: null,
          acknowledgedAt: new Date(),
        },
      });
      // This acknowledgment only records delivery to Central. The order stays
      // in provisioning until the licensing authority confirms activation.
      return { id, status: "SENT" };
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
      return { id, status: "FAILED" };
    }
  }
}
