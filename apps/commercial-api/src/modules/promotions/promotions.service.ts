import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { MoneyCentsSchema } from "@camacho-pos-comercial/contracts";
import { PRISMA } from "../../common/prisma.tokens.js";

@Injectable()
export class PromotionsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

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
    const now = new Date();
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
}
