import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient, PublicationStatus } from "@camacho-pos-comercial/database";
import { MoneyCentsSchema } from "@camacho-pos-comercial/contracts";
import { PRISMA } from "../../common/prisma.tokens.js";
import { bogotaNow, formatBogotaIsoDate, isWithinWindow } from "../../common/time/bogota.js";

export type PublicPromotionDto = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  publicationStatus: PublicationStatus;
  startsAt: string | null;
  endsAt: string | null;
  validUntil: string | null;
  active: boolean;
  ctaHref: string;
  ctaLabel: string;
};

@Injectable()
export class PromotionsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Public list: promotions whose window includes "now" (America/Bogota instant).
   * Non-production may include DRAFT for staging; production is PUBLISHED only.
   */
  async listActivePublic(options?: { includeDraft?: boolean }): Promise<PublicPromotionDto[]> {
    const now = bogotaNow();
    const statuses: PublicationStatus[] = options?.includeDraft
      ? ["DRAFT", "PUBLISHED"]
      : ["PUBLISHED"];

    const rows = await this.prisma.promotion.findMany({
      where: {
        deletedAt: null,
        publicationStatus: { in: statuses },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      include: { coupons: { where: { deletedAt: null }, take: 3 } },
    });

    return rows.map((row) => this.toPublicDto(row, now));
  }

  async listAllAdmin() {
    return this.prisma.promotion.findMany({
      where: { deletedAt: null },
      include: { coupons: { where: { deletedAt: null } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createPromotion(input: {
    code: string;
    name: string;
    description?: string;
    publicationStatus?: PublicationStatus;
    startsAt?: string | null;
    endsAt?: string | null;
  }) {
    return this.prisma.promotion.create({
      data: {
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description,
        publicationStatus: input.publicationStatus ?? "DRAFT",
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
    });
  }

  async updatePromotion(
    id: string,
    input: {
      name?: string;
      description?: string | null;
      publicationStatus?: PublicationStatus;
      startsAt?: string | null;
      endsAt?: string | null;
    },
  ) {
    const existing = await this.prisma.promotion.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: "PROMOTION_NOT_FOUND" });
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.publicationStatus != null ? { publicationStatus: input.publicationStatus } : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
          : {}),
      },
    });
  }

  async softDeletePromotion(id: string) {
    const existing = await this.prisma.promotion.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: "PROMOTION_NOT_FOUND" });
    return this.prisma.promotion.update({
      where: { id },
      data: { deletedAt: new Date(), publicationStatus: "ARCHIVED" },
    });
  }

  async listCouponsAdmin() {
    return this.prisma.coupon.findMany({
      where: { deletedAt: null },
      include: { promotion: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createCoupon(input: {
    code: string;
    type: "PERCENT" | "FIXED_AMOUNT";
    percentOff?: number | null;
    amountOffCents?: number | null;
    minSubtotalCents?: number | null;
    maxRedemptions?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    active?: boolean;
    promotionId?: string | null;
  }) {
    return this.prisma.coupon.create({
      data: {
        code: input.code.toUpperCase(),
        type: input.type,
        percentOff: input.percentOff ?? null,
        amountOffCents: input.amountOffCents ?? null,
        minSubtotalCents: input.minSubtotalCents ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        active: input.active ?? true,
        promotionId: input.promotionId ?? null,
      },
    });
  }

  async updateCoupon(
    id: string,
    input: {
      type?: "PERCENT" | "FIXED_AMOUNT";
      percentOff?: number | null;
      amountOffCents?: number | null;
      minSubtotalCents?: number | null;
      maxRedemptions?: number | null;
      startsAt?: string | null;
      endsAt?: string | null;
      active?: boolean;
      promotionId?: string | null;
    },
  ) {
    const existing = await this.prisma.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: "COUPON_NOT_FOUND" });
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(input.type != null ? { type: input.type } : {}),
        ...(input.percentOff !== undefined ? { percentOff: input.percentOff } : {}),
        ...(input.amountOffCents !== undefined ? { amountOffCents: input.amountOffCents } : {}),
        ...(input.minSubtotalCents !== undefined
          ? { minSubtotalCents: input.minSubtotalCents }
          : {}),
        ...(input.maxRedemptions !== undefined ? { maxRedemptions: input.maxRedemptions } : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
          : {}),
        ...(input.endsAt !== undefined
          ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.promotionId !== undefined ? { promotionId: input.promotionId } : {}),
      },
    });
  }

  async softDeleteCoupon(id: string) {
    const existing = await this.prisma.coupon.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: "COUPON_NOT_FOUND" });
    return this.prisma.coupon.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  async assertCouponApplicable(code: string, subtotalCents: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon || coupon.deletedAt) {
      throw new NotFoundException({ code: "COUPON_NOT_FOUND" });
    }
    if (!coupon.active) {
      throw new BadRequestException({ code: "COUPON_INACTIVE" });
    }
    const now = bogotaNow();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException({ code: "COUPON_NOT_STARTED" });
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      throw new BadRequestException({ code: "COUPON_EXPIRED" });
    }
    if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new BadRequestException({ code: "COUPON_EXHAUSTED" });
    }
    if (coupon.minSubtotalCents != null && subtotalCents < coupon.minSubtotalCents) {
      throw new BadRequestException({ code: "COUPON_MIN_SUBTOTAL" });
    }
    return coupon;
  }

  async computeDiscount(code: string, subtotalCents: number): Promise<number> {
    const coupon = await this.assertCouponApplicable(code, subtotalCents);
    let discount = 0;
    if (coupon.type === "PERCENT") {
      const pct = coupon.percentOff ?? 0;
      discount = Math.floor((subtotalCents * pct) / 100);
    } else if (coupon.type === "FIXED_AMOUNT") {
      discount = coupon.amountOffCents ?? 0;
    }
    discount = Math.min(discount, subtotalCents);
    return MoneyCentsSchema.parse(discount);
  }

  private toPublicDto(
    row: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      publicationStatus: PublicationStatus;
      startsAt: Date | null;
      endsAt: Date | null;
    },
    now: Date,
  ): PublicPromotionDto {
    const { href, label } = ctaForPromotion(row.code);
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      publicationStatus: row.publicationStatus,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      validUntil: formatBogotaIsoDate(row.endsAt),
      active: isWithinWindow(now, row.startsAt, row.endsAt),
      ctaHref: href,
      ctaLabel: label,
    };
  }
}

function ctaForPromotion(code: string): { href: string; label: string } {
  const upper = code.toUpperCase();
  if (upper.includes("KIT")) return { href: "/equipos", label: "Ver kits" };
  if (upper.includes("ANUAL") || upper.includes("ANNUAL")) {
    return { href: "/planes", label: "Ver planes anuales" };
  }
  if (upper.includes("DEMO") || upper.includes("LANZAMIENTO")) {
    return { href: "/solicitar-demo", label: "Solicitar demo" };
  }
  return { href: "/promociones", label: "Ver promoción" };
}
