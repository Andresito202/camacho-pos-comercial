import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";
import { AuditService } from "../audit/audit.service.js";

const retryableStatuses = ["PENDING", "QUEUED", "FAILED"] as const;
const centralTimeoutMs = 20_000;
const attemptLeaseMs = 60_000;
const maxRetryDelayMs = 60 * 60_000;
const paidOrderStatuses = ["PAID", "PROVISIONING"] as const;
const uuid = z.string().uuid();
const confirmedPayment = {
  some: { provider: "FACTUS_PAY", status: "PAID", paidAt: { not: null } },
} as const;

const eligibleOrder = {
  status: { in: [...paidOrderStatuses] }, deletedAt: null, payments: confirmedPayment,
} satisfies Prisma.OrderWhereInput;

const boundOrderInclude = {
  items: { include: { planPrice: { select: { planId: true, version: true, centralPlanId: true, billingInterval: true } } } },
  customer: { select: { email: true } },
  businessProfile: true,
} satisfies Prisma.OrderInclude;
type BoundOrder = Prisma.OrderGetPayload<{ include: typeof boundOrderInclude }>;

function bindingSelection(order: BoundOrder) {
  const profile = order.businessProfile;
  if (!profile || profile.deletedAt || profile.customerId !== order.customerId) {
    return { error: "PROVISION_BUSINESS_REQUIRED" } as const;
  }
  const lines = order.items.filter(item => item.planId !== null || item.planPriceId !== null);
  const first = lines[0];
  if (!first?.planPriceId || !first.planId ||
      lines.some(line => line.planPriceId !== first.planPriceId || line.planId !== first.planId)) {
    return { error: "PROVISION_SINGLE_PLAN_PRICE_REQUIRED" } as const;
  }
  if (lines.length > 200) return { error: "PROVISION_PLAN_LINE_LIMIT" } as const;
  const units = lines.reduce((sum, item) => sum + item.quantity, 0);
  if (units < 1 || units > 10_000) return { error: "PROVISION_UNITS_INVALID" } as const;
  return { profile, lines, price: first.planPrice, planId: first.planId, planPriceId: first.planPriceId, units } as const;
}
type SelectedBinding = Exclude<ReturnType<typeof bindingSelection>, { error: string }>;

function dueProvisioning(now: Date): Prisma.ProvisioningRequestWhereInput {
  return {
    status: { in: [...retryableStatuses] },
    wirePreparedAt: { not: null },
    order: eligibleOrder,
    OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
  };
}

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
 * A GLOBAL operator binds a paid order to a Central tenant and plan.
 * Only the frozen order payload can be retried against Central.
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
    const order = await tx.order.findFirst({
      where: { ...eligibleOrder, id: orderId },
      include: boundOrderInclude,
    });
    if (!order) return null;
    const idempotencyKey = createHash("sha256").update(`provision:${orderId}`).digest("hex");
    const existing = await tx.provisioningRequest.findUnique({ where: { idempotencyKey } });
    const request = existing ?? await tx.provisioningRequest.create({
      data: {
        orderId,
        status: "PENDING",
        idempotencyKey,
        payload: { orderId, orderNumber: order.orderNumber },
        lastError: "PROVISION_BINDING_REQUIRED",
      },
    });
    // Reuse only mappings previously pinned to this customer and exact offer.
    // Recurring terms and commercial deployment have separate release gates.
    if (!this.config.isProduction && !request.wirePreparedAt && request.attemptCount === 0 &&
        request.acknowledgedAt === null && request.status === "PENDING") {
      const selection = bindingSelection(order);
      if (!("error" in selection)) {
        const { price, planId, profile, lines } = selection;
        const tenant = uuid.safeParse(profile.centralTenantId);
        const plan = uuid.safeParse(price?.centralPlanId);
        if (price?.billingInterval === "PERPETUAL" && price.planId === planId &&
            lines.every(line => line.priceVersion === price.version) && tenant.success && plan.success) {
          return this.freezeBinding(tx, order, selection, request.id, tenant.data, plan.data);
        }
      }
    }
    if (existing) return existing;
    await this.audit.record({
      actorType: "SYSTEM",
      action: "PROVISIONING_PENDING_BINDING",
      entityType: "ProvisioningRequest",
      entityId: request.id,
      metadata: { orderId },
    }, tx);
    return request;
  }

  async bindPaidOrder(orderId: string, actorId: string, centralTenantId: string, centralPlanId: string) {
    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({
        where: { ...eligibleOrder, id: orderId },
        include: boundOrderInclude,
      });
      if (!order) throw new NotFoundException({ code: "PAID_ORDER_NOT_FOUND" });
      const selection = bindingSelection(order);
      if ("error" in selection) throw new ConflictException({ code: selection.error });
      const { profile, planId, planPriceId } = selection;
      const existingKey = createHash("sha256").update(`provision:${orderId}`).digest("hex");
      const request = await tx.provisioningRequest.findUnique({ where: { idempotencyKey: existingKey } });
      if (!request) throw new NotFoundException({ code: "PROVISION_REQUEST_NOT_FOUND" });
      if (request.wirePreparedAt) {
        const payload = request.payload as Record<string, unknown>;
        if (payload.tenantId !== centralTenantId || payload.planId !== centralPlanId) {
          throw new ConflictException({ code: "PROVISION_BINDING_ALREADY_FROZEN" });
        }
        return { id: request.id, status: request.status };
      }
      if (request.attemptCount !== 0 || request.acknowledgedAt !== null) {
        throw new ConflictException({ code: "PROVISION_LEGACY_RECONCILIATION_REQUIRED" });
      }

      const plan = await tx.planPrice.updateMany({
        where: {
          id: planPriceId, planId,
          OR: [{ centralPlanId: null }, { centralPlanId }],
        },
        data: { centralPlanId },
      });
      if (plan.count !== 1) throw new ConflictException({ code: "PROVISION_PLAN_BINDING_CONFLICT" });
      const company = await tx.businessProfile.updateMany({
        where: { id: profile.id, deletedAt: null, OR: [{ centralTenantId: null }, { centralTenantId }] },
        data: { centralTenantId },
      });
      if (company.count !== 1) throw new ConflictException({ code: "PROVISION_TENANT_BINDING_CONFLICT" });

      return this.freezeBinding(tx, order, selection, request.id, centralTenantId, centralPlanId, actorId);
    });
  }

  private async freezeBinding(
    tx: Prisma.TransactionClient, order: BoundOrder, selection: SelectedBinding, requestId: string,
    centralTenantId: string, centralPlanId: string, actorId?: string,
  ) {
    const { profile, planPriceId, lines, units } = selection;
    const orderId = order.id;
    const prepared = await tx.provisioningRequest.updateMany({
      where: {
        id: requestId, status: { in: [...retryableStatuses] }, wirePreparedAt: null,
        attemptCount: 0, acknowledgedAt: null,
        order: { status: { in: [...paidOrderStatuses] }, deletedAt: null, payments: confirmedPayment },
      },
      data: {
        wirePreparedAt: new Date(), status: "QUEUED", nextRetryAt: new Date(), lastError: null,
        payload: {
          orderId, orderNumber: order.orderNumber, customerEmail: order.customer.email,
          businessProfileId: profile.id, tenantId: centralTenantId, planId: centralPlanId,
          licenseUnits: units, cajaRule: "ONE_LICENSE_ONE_CAJA",
          items: lines.map(line => ({
            label: line.label, quantity: line.quantity, planId: centralPlanId,
            priceVersion: line.priceVersion, unitAmountCents: line.unitAmountCents,
          })),
        },
      },
    });
    if (prepared.count !== 1) throw new ConflictException({ code: "PROVISION_BINDING_CHANGED" });
    const updated = await tx.order.updateMany({
      where: { id: orderId, deletedAt: null, status: { in: [...paidOrderStatuses] }, payments: confirmedPayment },
      data: { status: "PROVISIONING" },
    });
    if (updated.count !== 1) throw new ConflictException({ code: "PROVISION_ORDER_CHANGED" });
    await this.audit.record({
      actorType: actorId ? "ADMIN" : "SYSTEM", actorId,
      action: actorId ? "PROVISIONING_BINDING_PREPARED" : "PROVISIONING_BINDING_REUSED",
      entityType: "ProvisioningRequest", entityId: requestId,
      metadata: { orderId, centralPlanId, centralTenantId, planPriceId },
    }, tx);
    return { id: requestId, status: "QUEUED" as const };
  }

  async processDue(limit = 20) {
    const due = await this.prisma.provisioningRequest.findMany({
      where: dueProvisioning(await this.databaseTime()),
      select: { id: true, attemptCount: true, idempotencyKey: true, payload: true },
      take: limit,
      orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });

    const results: Array<{ id: string; status: string }> = [];
    for (const item of due) {
      results.push(await this.attemptSend(item));
    }
    return results;
  }

  private async databaseTime(): Promise<Date> {
    const [value] = await this.prisma.$queryRaw<{ now: Date }[]>`SELECT statement_timestamp() AS now`;
    return value!.now;
  }

  private async attemptSend(item: Pick<Prisma.ProvisioningRequestGetPayload<object>,
    "id" | "attemptCount" | "idempotencyKey" | "payload">) {
    const { id } = item;
    const payload = item.payload as Record<string, unknown>;
    if (!uuid.safeParse(payload?.tenantId).success || !uuid.safeParse(payload?.planId).success) {
      return { id, status: "UNCHANGED" };
    }

    // Reserve the attempt before the outbound call. The same durable deadline
    // makes an interrupted attempt eligible again without an in-memory lock.
    const now = await this.databaseTime();
    const claim = await this.prisma.provisioningRequest.updateMany({
      where: { ...dueProvisioning(now), id, attemptCount: item.attemptCount },
      data: { nextRetryAt: new Date(now.getTime() + attemptLeaseMs), attemptCount: { increment: 1 } },
    });
    if (claim.count !== 1) return { id, status: "UNCHANGED" };

    const persist = async (data: Prisma.ProvisioningRequestUpdateManyMutationInput) => {
      const result = await this.prisma.provisioningRequest.updateMany({
        where: {
          id,
          attemptCount: item.attemptCount + 1,
          status: { in: [...retryableStatuses] },
          order: eligibleOrder,
        },
        data,
      });
      return result.count === 1;
    };
    const retryDelay = Math.min(maxRetryDelayMs, 60_000 * 2 ** Math.min(6, item.attemptCount));
    const retryAt = async () => {
      const databaseNow = await this.databaseTime();
      return new Date(databaseNow.getTime() + randomInt(Math.floor(retryDelay * 0.8), retryDelay + 1));
    };
    // Central's current order issuer gives licenses no expiry. Keep this path
    // disabled in production while commercial term and activation are uncertified.
    if (this.config.isProduction) {
      const saved = await persist({ status: "PENDING", lastError: "PROVISION_PRODUCTION_NOT_CERTIFIED", nextRetryAt: await retryAt() });
      return { id, status: saved ? "PENDING" : "UNCHANGED" };
    }
    const origin = this.config.centralOrigin();
    const bridgeKey = this.config.env.COMMERCIAL_BRIDGE_KEY?.trim() ?? "";
    if (!origin || bridgeKey.length < 32) {
      const lastError = origin ? "PENDING_COMMERCIAL_BRIDGE_KEY" : "PENDING_CENTRAL_CREDENTIALS";
      const saved = await persist({ status: "PENDING", lastError, nextRetryAt: await retryAt() });
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
        signal: AbortSignal.timeout(centralTimeoutMs),
      });
      if (!response.ok) {
        throw new Error(`CENTRAL_HTTP_${response.status}`);
      }
      const parsed = centralResponse.safeParse(await response.json());
      if (!parsed.success) throw new Error("CENTRAL_PROVISIONING_RESPONSE_INVALID");
      const body = parsed.data;
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
        nextRetryAt: issued ? null : await retryAt(),
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
      const saved = await persist({ status: "FAILED", lastError: message, nextRetryAt: await retryAt() });
      return { id, status: saved ? "FAILED" : "UNCHANGED" };
    }
  }
}
