import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { lineTotal, type AddCartItemInput } from "@camacho-pos-comercial/contracts";
import { PRISMA } from "../../common/prisma.tokens.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { PromotionsService } from "../promotions/promotions.service.js";

@Injectable()
export class CartService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(PromotionsService) private readonly promotions: PromotionsService,
  ) {}

  async createCart() {
    const sessionToken = randomBytes(24).toString("hex");
    const cart = await this.prisma.cart.create({
      data: { sessionToken, status: "OPEN" },
      include: { items: true },
    });
    return this.toView(cart);
  }

  async getBySession(sessionToken: string) {
    const cart = await this.requireOpenCart(sessionToken);
    return this.toView(cart);
  }

  async addItem(sessionToken: string, input: AddCartItemInput) {
    const cart = await this.requireOpenCart(sessionToken);
    const priced = await this.resolvePricedItem(input);

    if (input.expectedUnitAmountCents !== undefined && input.expectedUnitAmountCents !== priced.unitAmountCents) {
      throw new BadRequestException({
        code: "PRICE_TAMPERING_REJECTED",
        message: "Client-supplied unit amount does not match server price.",
      });
    }
    if (input.expectedPriceVersion !== priced.priceVersion) {
      throw new BadRequestException({
        code: "PRICE_VERSION_MISMATCH",
        message: "Stale or tampered price version.",
      });
    }

    const qty = input.quantity ?? 1;
    const line = lineTotal(priced.unitAmountCents, qty);

    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        planId: priced.planId,
        planPriceId: priced.planPriceId,
        productId: priced.productId,
        productVariantId: priced.productVariantId,
        kitId: priced.kitId,
        quantity: qty,
        unitAmountCents: priced.unitAmountCents,
        lineTotalCents: line,
        priceVersion: priced.priceVersion,
        label: priced.label,
      },
    });

    return this.recalculate(cart.id);
  }

  async applyCoupon(sessionToken: string, code: string) {
    const cart = await this.requireOpenCart(sessionToken);
    await this.promotions.assertCouponApplicable(code, cart.subtotalCents || 0);
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponCode: code.toUpperCase() },
    });
    return this.recalculate(cart.id);
  }

  async recalculate(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });
    if (!cart) throw new NotFoundException({ code: "CART_NOT_FOUND" });

    const subtotalCents = cart.items.reduce((sum, item) => sum + item.lineTotalCents, 0);
    let discountCents = 0;
    if (cart.couponCode) {
      discountCents = await this.promotions.computeDiscount(cart.couponCode, subtotalCents);
    }
    const shippingCents = cart.shippingCents;
    const taxCents = 0;
    const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents + taxCents);

    const updated = await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotalCents,
        discountCents,
        taxCents,
        totalCents,
      },
      include: { items: true },
    });
    return this.toView(updated);
  }

  private async resolvePricedItem(input: AddCartItemInput) {
    if (input.planPriceId) {
      const price = await this.catalog.getPurchasablePlanPrice(input.planPriceId);
      return {
        planId: price.planId,
        planPriceId: price.id,
        productId: null as string | null,
        productVariantId: null as string | null,
        kitId: null as string | null,
        unitAmountCents: price.amountCents,
        priceVersion: price.version,
        label: `${price.plan.name} (${price.billingInterval})`,
      };
    }
    if (input.kitId) {
      const kit = await this.catalog.getPurchasableKit(input.kitId);
      return {
        planId: null,
        planPriceId: null,
        productId: kit.productId,
        productVariantId: null,
        kitId: kit.id,
        unitAmountCents: kit.amountCents,
        priceVersion: kit.priceVersion,
        label: kit.name,
      };
    }
    if (input.productVariantId) {
      const variant = await this.catalog.getPurchasableVariant(input.productVariantId);
      return {
        planId: null,
        planPriceId: null,
        productId: variant.productId,
        productVariantId: variant.id,
        kitId: null,
        unitAmountCents: variant.amountCents,
        priceVersion: variant.version,
        label: `${variant.product.name} — ${variant.name}`,
      };
    }
    throw new BadRequestException({ code: "INVALID_CART_ITEM" });
  }

  private async requireOpenCart(sessionToken: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { sessionToken },
      include: { items: true },
    });
    if (!cart) throw new NotFoundException({ code: "CART_NOT_FOUND" });
    if (cart.status !== "OPEN" && cart.status !== "CHECKOUT") {
      throw new BadRequestException({ code: "CART_NOT_MUTABLE", status: cart.status });
    }
    return cart;
  }

  private toView(cart: {
    id: string;
    sessionToken: string;
    status: string;
    couponCode: string | null;
    currencyCode: string;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    taxCents: number;
    totalCents: number;
    items: Array<{
      id: string;
      label: string;
      quantity: number;
      unitAmountCents: number;
      lineTotalCents: number;
      priceVersion: number;
      planPriceId: string | null;
      productVariantId: string | null;
      kitId: string | null;
    }>;
  }) {
    return {
      id: cart.id,
      sessionToken: cart.sessionToken,
      status: cart.status,
      couponCode: cart.couponCode,
      items: cart.items.map((item) => ({
        id: item.id,
        label: item.label,
        quantity: item.quantity,
        unitAmountCents: item.unitAmountCents,
        lineTotalCents: item.lineTotalCents,
        priceVersion: item.priceVersion,
        planPriceId: item.planPriceId,
        productVariantId: item.productVariantId,
        kitId: item.kitId,
      })),
      totals: {
        currencyCode: "COP" as const,
        subtotalCents: cart.subtotalCents,
        discountCents: cart.discountCents,
        shippingCents: cart.shippingCents,
        taxCents: cart.taxCents,
        totalCents: cart.totalCents,
      },
    };
  }
}
