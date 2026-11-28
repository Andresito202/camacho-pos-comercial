import { Inject, Controller, Get, Param, Query } from "@nestjs/common";
import { AppConfigService } from "../../config/config.service.js";
import { PromotionsService } from "./promotions.service.js";

@Controller("promotions")
export class PromotionsController {
  constructor(
    @Inject(PromotionsService) private readonly promotions: PromotionsService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  /**
   * GET /v1/promotions — active promotions by America/Bogota window.
   * Non-production includes DRAFT when includeDraft≠0 (staging preview).
   */
  @Get()
  listActive(@Query("includeDraft") includeDraft?: string) {
    const allowDraft = !this.config.isProduction && includeDraft !== "0";
    return this.promotions.listActivePublic({ includeDraft: allowDraft });
  }

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
