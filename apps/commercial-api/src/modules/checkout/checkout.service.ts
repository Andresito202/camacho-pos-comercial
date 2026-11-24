import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import type { CreateCheckoutInput } from "@camacho-pos-comercial/contracts";
import { PRISMA } from "../../common/prisma.tokens.js";
import { CartService } from "../cart/cart.service.js";
import { PaymentsService } from "../payments/payments.service.js";
import { AuditService } from "../audit/audit.service.js";

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(CartService) private readonly carts: CartService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async checkout(input: CreateCheckoutInput) {
    const cartRow = await this.prisma.cart.findUniqueOrThrow({
      where: { sessionToken: input.cartSessionToken },
    });
    const cartView = await this.carts.recalculate(cartRow.id);

    if (cartView.items.length === 0) {
      throw new BadRequestException({ code: "CART_EMPTY" });
    }
    if (cartView.totals.totalCents <= 0) {
      throw new BadRequestException({ code: "INVALID_ORDER_TOTAL" });
    }

    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { payments: true },
    });
    if (existing) {
      return this.toOrderView(existing);
    }

    const customer = await this.prisma.commercialCustomer.upsert({
      where: { email: input.customer.email.toLowerCase() },
      create: {
        email: input.customer.email.toLowerCase(),
        fullName: input.customer.fullName,
        phoneE164: input.customer.phoneE164,
        documentType: input.customer.documentType,
        documentNumber: input.customer.documentNumber,
      },
      update: {
        fullName: input.customer.fullName,
        phoneE164: input.customer.phoneE164,
      },
    });

    let businessProfileId: string | undefined;
    if (input.business) {
      const profile = await this.prisma.businessProfile.create({
        data: {
          customerId: customer.id,
          legalName: input.business.legalName,
          tradeName: input.business.tradeName,
          nit: input.business.nit,
          cityCode: input.business.cityCode,
          departmentCode: input.business.departmentCode,
          addressLine: input.business.addressLine,
          sector: input.business.sector,
          cajaCount: input.business.cajaCount,
        },
      });
      businessProfileId = profile.id;
    }

    const cart = await this.prisma.cart.findUnique({
      where: { sessionToken: input.cartSessionToken },
      include: { items: true },
    });
    if (!cart) throw new NotFoundException({ code: "CART_NOT_FOUND" });

    const orderNumber = `CPC-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          cartId: cart.id,
          customerId: customer.id,
          businessProfileId,
          status: "PENDING_PAYMENT",
          currencyCode: "COP",
          subtotalCents: cartView.totals.subtotalCents,
          discountCents: cartView.totals.discountCents,
          shippingCents: cartView.totals.shippingCents,
          taxCents: cartView.totals.taxCents,
          totalCents: cartView.totals.totalCents,
          couponCode: cart.couponCode,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: cart.items.map((item) => ({
              planId: item.planId,
              planPriceId: item.planPriceId,
              productId: item.productId,
              productVariantId: item.productVariantId,
              kitId: item.kitId,
              quantity: item.quantity,
              unitAmountCents: item.unitAmountCents,
              lineTotalCents: item.lineTotalCents,
              priceVersion: item.priceVersion,
              label: item.label,
            })),
          },
        },
        include: { payments: true },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: "CHECKOUT", customerId: customer.id },
      });

      return created;
    });

    const payment = await this.payments.createCollectionForOrder({
      orderId: order.id,
      customerId: customer.id,
      amountCents: order.totalCents,
    });

    await this.audit.record({
      actorType: "CUSTOMER",
      actorId: customer.id,
      action: "CHECKOUT_CREATED",
      entityType: "Order",
      entityId: order.id,
      metadata: { orderNumber, paymentReference: payment.referenceCode },
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      currencyCode: "COP" as const,
      paymentReference: payment.referenceCode,
      payment: {
        status: payment.status,
        environment: payment.environment,
        provider: payment.provider,
        qrPayload: payment.qrPayload,
      },
    };
  }

  private toOrderView(order: {
    id: string;
    orderNumber: string;
    status: string;
    totalCents: number;
    payments: Array<{ referenceCode: string }>;
  }) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      currencyCode: "COP" as const,
      paymentReference: order.payments[0]?.referenceCode ?? null,
    };
  }
}
