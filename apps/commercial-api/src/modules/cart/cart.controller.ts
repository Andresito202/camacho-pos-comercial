import { Inject, Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ApplyCouponSchema, parseAddCartItem } from "@camacho-pos-comercial/contracts";
import { parseOrBadRequest } from "../../common/parse-or-bad-request.js";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service.js";
import { CartService } from "./cart.service.js";

@Controller("cart")
export class CartController {
  constructor(
    @Inject(CartService) private readonly carts: CartService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  create(@Req() req: { ip?: string }) {
    this.rateLimit.assert(`cart:create:${req.ip ?? "unknown"}`, 60, 60_000);
    return this.carts.createCart();
  }

  @Get(":sessionToken")
  get(@Param("sessionToken") sessionToken: string) {
    return this.carts.getBySession(sessionToken);
  }

  @Post(":sessionToken/items")
  addItem(
    @Param("sessionToken") sessionToken: string,
    @Body() body: unknown,
    @Req() req: { ip?: string },
  ) {
    this.rateLimit.assert(`cart:items:${req.ip ?? "unknown"}`, 120, 60_000);
    const input = parseOrBadRequest(() => parseAddCartItem(body));
    return this.carts.addItem(sessionToken, input);
  }

  @Post(":sessionToken/coupon")
  applyCoupon(@Param("sessionToken") sessionToken: string, @Body() body: unknown) {
    const { code } = parseOrBadRequest(() => ApplyCouponSchema.parse(body));
    return this.carts.applyCoupon(sessionToken, code);
  }
}
