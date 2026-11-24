import { Inject, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApplyCouponSchema, parseAddCartItem } from "@camacho-pos-comercial/contracts";
import { CartService } from "./cart.service.js";

@Controller("cart")
export class CartController {
  constructor(@Inject(CartService) private readonly carts: CartService) {}

  @Post()
  create() {
    return this.carts.createCart();
  }

  @Get(":sessionToken")
  get(@Param("sessionToken") sessionToken: string) {
    return this.carts.getBySession(sessionToken);
  }

  @Post(":sessionToken/items")
  addItem(@Param("sessionToken") sessionToken: string, @Body() body: unknown) {
    const input = parseAddCartItem(body);
    return this.carts.addItem(sessionToken, input);
  }

  @Post(":sessionToken/coupon")
  applyCoupon(@Param("sessionToken") sessionToken: string, @Body() body: unknown) {
    const { code } = ApplyCouponSchema.parse(body);
    return this.carts.applyCoupon(sessionToken, code);
  }
}
