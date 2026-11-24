import { Inject, Controller, Get, Param } from "@nestjs/common";
import { PromotionsService } from "./promotions.service.js";

@Controller("promotions")
export class PromotionsController {
  constructor(@Inject(PromotionsService) private readonly promotions: PromotionsService) {}

  @Get("coupons/:code/validate")
  async validate(@Param("code") code: string) {
    const coupon = await this.promotions.assertCouponApplicable(code, 0);
    return {
      code: coupon.code,
      type: coupon.type,
      percentOff: coupon.percentOff,
      amountOffCents: coupon.amountOffCents,
      active: coupon.active,
    };
  }
}
