import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";
import { AuditService } from "../audit/audit.service.js";

export function commercialProvisioningKey(orderId: string): string {
  return createHash("sha256").update(`provision:${orderId}`).digest("hex");
}
const retryableStatuses = ["PENDING", "QUEUED", "FAILED"] as const;
const activationPollMs = 30_000;
const billingInterval = z.enum(["PERPETUAL", "MONTHLY", "ANNUAL"]);
const centralTimeoutMs = 20_000;
const attemptLeaseMs = 60_000;
const maxRetryDelayMs = 60 * 60_000;
const paidOrderStatuses = ["PAID", "PROVISIONING"] as const;
const uuid = z.string().uuid();
const confirmedPayment = {
  some: { provider: "FACTUS_PAY", status: "PAID", paidAt: { not: null } },
} as const;

const paidOrderEvidence = {
  provider: "FACTUS_PAY", environment: "SANDBOX", status: "PAID", paidAt: { not: null },
  events: { some: { provider: "FACTUS_PAY", environment: "SANDBOX", eventType: "collection.paid" } },
} satisfies Prisma.PaymentWhereInput;

const eligibleOrder = {
  status: { in: [...paidOrderStatuses] }, deletedAt: null, payments: confirmedPayment,
} satisfies Prisma.OrderWhereInput;

const boundOrderInclude = {
  items: { include: { planPrice: { select: { planId: true, version: true, centralPlanId: true, billingInterval: true } } } },
  customer: { select: { email: true } },
  businessProfile: true,
  payments: { where: paidOrderEvidence, select: { referenceCode: true, paidAt: true, amountCents: true, currencyCode: true } },
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
    wirePreparedAt: { not: null },
    order: eligibleOrder,
    OR: [
      { status: { in: [...retryableStatuses] }, OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] },
      { status: "SENT", nextRetryAt: { lte: now } },
    ],
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

const activationResponse = z.object({
  orderId: z.string().min(1),
  provisioningId: z.string().min(8),
  receipts: z.array(z.object({ licenseId: uuid, activationId: uuid, receiptId: uuid }).strict()).max(10_000),
}).strict();

const frozenPaidOrder = z.object({ companyId: uuid, paymentReference: z.string().min(1),
  paidAt: z.string().datetime(), billingInterval }).strict();
const issuance = z.object({ centralProvisioningId: z.string().min(8), centralLicenseIds: z.array(uuid).min(1).max(10_000),
  orderId: z.string().min(1), paidOrder: frozenPaidOrder });

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
    const idempotencyKey = commercialProvisioningKey(orderId);
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
        const company = uuid.safeParse(profile.centralCompanyId);
        if (price?.planId === planId && (company.success
              ? billingInterval.safeParse(price.billingInterval).success : price.billingInterval === "PERPETUAL") &&
            lines.every(line => line.priceVersion === price.version) && tenant.success && plan.success) {
          return this.freezeBinding(tx, order, selection, request.id, tenant.data, plan.data, company.data);
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

  async bindPaidOrder(orderId: string, actorId: string, centralTenantId: string, centralPlanId: string, centralCompanyId?: string) {
    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({
        where: { ...eligibleOrder, id: orderId },
        include: boundOrderInclude,
      });
      if (!order) throw new NotFoundException({ code: "PAID_ORDER_NOT_FOUND" });
      const selection = bindingSelection(order);
      if ("error" in selection) throw new ConflictException({ code: selection.error });
      const { profile, planId, planPriceId } = selection;
      const existingKey = commercialProvisioningKey(orderId);
      const request = await tx.provisioningRequest.findUnique({ where: { idempotencyKey: existingKey } });
      if (!request) throw new NotFoundException({ code: "PROVISION_REQUEST_NOT_FOUND" });
      if (request.wirePreparedAt) {
        const payload = request.payload as Record<string, unknown>;
        if (payload.tenantId !== centralTenantId || payload.planId !== centralPlanId ||
            (centralCompanyId && frozenPaidOrder.safeParse(payload.paidOrder).data?.companyId !== centralCompanyId)) {
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
        where: { id: profile.id, deletedAt: null, OR: [{ centralTenantId: null }, { centralTenantId }],
          ...(centralCompanyId ? { AND: [{ OR: [{ centralCompanyId: null }, { centralCompanyId }] }] } : {}) },
        data: { centralTenantId, ...(centralCompanyId ? { centralCompanyId } : {}) },
      });
      if (company.count !== 1) throw new ConflictException({ code: "PROVISION_TENANT_BINDING_CONFLICT" });

      return this.freezeBinding(tx, order, selection, request.id, centralTenantId, centralPlanId, centralCompanyId ?? profile.centralCompanyId ?? undefined, actorId);
    });
  }

  private async freezeBinding(
    tx: Prisma.TransactionClient, order: BoundOrder, selection: SelectedBinding, requestId: string,
    centralTenantId: string, centralPlanId: string, centralCompanyId?: string, actorId?: string,
  ) {
    const { profile, planPriceId, lines, units } = selection;
    const orderId = order.id;
    const matchingPayments = order.payments.filter(payment => payment.amountCents === order.totalCents &&
      payment.currencyCode === order.currencyCode && payment.paidAt?.getTime() === order.paidAt?.getTime());
    const payment = matchingPayments.length === 1 ? matchingPayments[0] : undefined;
    const paidOrder = centralCompanyId ? frozenPaidOrder.safeParse({
      companyId: centralCompanyId, paymentReference: payment?.referenceCode, paidAt: payment?.paidAt?.toISOString(),
      billingInterval: selection.price?.billingInterval,
    }) : null;
    if (paidOrder && (!paidOrder.success || !selection.price ||
        lines.some(line => line.priceVersion !== selection.price?.version))) {
      throw new ConflictException({ code: "PROVISION_CONFIRMED_PAYMENT_OR_CONTRACT_REQUIRED" });
    }
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
          ...(paidOrder?.success ? { paidOrder: paidOrder.data } : {}),
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
      metadata: { orderId, centralPlanId, centralTenantId, centralCompanyId: centralCompanyId ?? null, planPriceId },
    }, tx);
    return { id: requestId, status: "QUEUED" as const };
  }

  async processDue(limit = 20) {
    const due = await this.prisma.provisioningRequest.findMany({
      where: dueProvisioning(await this.databaseTime()),
      select: { id: true, attemptCount: true, idempotencyKey: true, payload: true, status: true, orderId: true },
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
    "id" | "attemptCount" | "idempotencyKey" | "payload" | "status" | "orderId">) {
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
          status: item.status,
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
    const deferredStatus = item.status === "SENT" ? "SENT" : "PENDING";
    // Production issuance and polling remain disabled pending certification.
    if (this.config.isProduction) {
      const saved = await persist({ status: deferredStatus, lastError: "PROVISION_PRODUCTION_NOT_CERTIFIED", nextRetryAt: await retryAt() });
      return { id, status: saved ? deferredStatus : "UNCHANGED" };
    }
    const origin = this.config.centralOrigin();
    const bridgeKey = this.config.env.COMMERCIAL_BRIDGE_KEY?.trim() ?? "";
    if (!origin || bridgeKey.length < 32) {
      const lastError = origin ? "PENDING_COMMERCIAL_BRIDGE_KEY" : "PENDING_CENTRAL_CREDENTIALS";
      const saved = await persist({ status: deferredStatus, lastError, nextRetryAt: await retryAt() });
      if (saved) this.logger.warn(`Provisioning ${id} deferred: ${lastError}`);
      return { id, status: saved ? deferredStatus : "UNCHANGED" };
    }

    try {
      if (payload.paidOrder) {
        const central = new URL(origin);
        if (central.protocol !== "https:" || central.origin !== origin) throw new Error("CENTRAL_PAID_ORDER_HTTPS_REQUIRED");
      }
      const path = payload.paidOrder ? "/v1/commercial/provisioning"
        : this.config.env.CENTRAL_PROVISIONING_PATH || "/v1/commercial/provisioning";
      const lease = item.attemptCount + 1;
      if (item.status === "SENT") {
        const bound = issuance.parse(payload);
        if (bound.orderId !== item.orderId) throw new Error("CENTRAL_PROVISIONING_ORDER_MISMATCH");
        const response = await fetch(`${origin}/v1/commercial/provisioning/activation-status`, {
          method: "POST", redirect: "error",
          headers: { "content-type": "application/json", "idempotency-key": item.idempotencyKey,
            "x-central-commercial-bridge-key": bridgeKey },
          body: JSON.stringify({ orderId: bound.orderId, provisioningId: bound.centralProvisioningId }),
          signal: AbortSignal.timeout(centralTimeoutMs),
        });
        if (!response.ok) throw new Error(`CENTRAL_ACTIVATION_HTTP_${response.status}`);
        const evidence = activationResponse.parse(await response.json());
        const expected = new Set(bound.centralLicenseIds);
        const received = new Set(evidence.receipts.map(receipt => receipt.licenseId));
        if (evidence.orderId !== bound.orderId || evidence.provisioningId !== bound.centralProvisioningId ||
            expected.size !== bound.centralLicenseIds.length || received.size !== evidence.receipts.length ||
            new Set(evidence.receipts.map(receipt => receipt.receiptId)).size !== received.size ||
            new Set(evidence.receipts.map(receipt => receipt.activationId)).size !== received.size ||
            [...received].some(licenseId => !expected.has(licenseId))) {
          throw new Error("CENTRAL_ACTIVATION_EVIDENCE_MISMATCH");
        }
        if (received.size < expected.size) {
          const saved = await persist({ activationVerifiedAt: null, activationReceipts: Prisma.DbNull,
            lastError: "CENTRAL_ACTIVATION_PENDING", nextRetryAt: new Date((await this.databaseTime()).getTime() + activationPollMs) });
          return { id, status: saved ? "SENT" : "UNCHANGED" };
        }
        return await this.completeOrder(id, lease, bound, evidence.receipts);
      }
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
        nextRetryAt: issued ? (payload.paidOrder ? await this.databaseTime() : null) : await retryAt(),
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
      const status = item.status === "SENT" ? "SENT" : "FAILED";
      const saved = await persist({ status, lastError: message, nextRetryAt: await retryAt() });
      return { id, status: saved ? status : "UNCHANGED" };
    }
  }

  private async completeOrder(
    id: string, lease: number, bound: z.infer<typeof issuance>,
    receipts: z.infer<typeof activationResponse>["receipts"],
  ) {
    return this.prisma.$transaction(async tx => {
      // Shipment and cancellation transitions use the same order-row lock.
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${bound.orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { ...eligibleOrder, id: bound.orderId, payments: { some: {
          ...paidOrderEvidence, referenceCode: bound.paidOrder.paymentReference, paidAt: new Date(bound.paidOrder.paidAt),
        } } },
        select: {
          items: { select: { productId: true, productVariantId: true, kitId: true } },
          shipments: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1,
            select: { status: true, deliveredAt: true } },
        },
      });
      if (!order) return { id, status: "UNCHANGED" };
      const hardware = order.items.some(item => item.productId || item.productVariantId || item.kitId);
      const shipment = order.shipments[0];
      const complete = !hardware || (shipment?.status === "DELIVERED" && shipment.deliveredAt !== null);
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT statement_timestamp() AS now`;
      const verifiedAt = clock!.now;
      const saved = await tx.provisioningRequest.updateMany({
        where: { id, orderId: bound.orderId, attemptCount: lease, status: "SENT" },
        data: {
          status: complete ? "ACKNOWLEDGED" : "SENT", activationVerifiedAt: verifiedAt, activationReceipts: receipts,
          lastError: complete ? null : "PROVISION_DELIVERY_PENDING",
          nextRetryAt: complete ? null : new Date(verifiedAt.getTime() + activationPollMs),
        },
      });
      if (saved.count !== 1) return { id, status: "UNCHANGED" };
      if (!complete) return { id, status: "SENT" };
      await tx.order.update({ where: { id: bound.orderId }, data: { status: "FULFILLED" } });
      await this.audit.record({
        actorType: "SYSTEM", action: "PROVISIONING_ORDER_COMPLETED", entityType: "Order", entityId: bound.orderId,
        metadata: { provisioningRequestId: id, centralProvisioningId: bound.centralProvisioningId,
          licenses: receipts.length },
      }, tx);
      return { id, status: "ACKNOWLEDGED" };
    });
  }
}
