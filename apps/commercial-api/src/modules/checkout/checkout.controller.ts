import { Inject, Body, Controller, Post, Req } from "@nestjs/common";
import { parseCreateCheckout } from "@camacho-pos-comercial/contracts";
import { parseOrBadRequest } from "../../common/parse-or-bad-request.js";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service.js";
import { CheckoutService } from "./checkout.service.js";

@Controller("checkout")
export class CheckoutController {
  constructor(
    @Inject(CheckoutService) private readonly checkout: CheckoutService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  create(@Body() body: unknown, @Req() req: { ip?: string }) {
    this.rateLimit.assert(`checkout:${req.ip ?? "unknown"}`, 30, 60_000);
    const input = parseOrBadRequest(() => parseCreateCheckout(body));
    return this.checkout.checkout(input);
  }
}
