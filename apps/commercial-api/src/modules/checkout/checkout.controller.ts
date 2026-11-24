import { Inject, Body, Controller, Post } from "@nestjs/common";
import { parseCreateCheckout } from "@camacho-pos-comercial/contracts";
import { CheckoutService } from "./checkout.service.js";

@Controller("checkout")
export class CheckoutController {
  constructor(@Inject(CheckoutService) private readonly checkout: CheckoutService) {}

  @Post()
  create(@Body() body: unknown) {
    const input = parseCreateCheckout(body);
    return this.checkout.checkout(input);
  }
}
