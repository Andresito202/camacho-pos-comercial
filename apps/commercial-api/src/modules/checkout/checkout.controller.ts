import { Inject, Body, Controller, Post } from "@nestjs/common";
import { parseCreateCheckout } from "@camacho-pos-comercial/contracts";
import { parseOrBadRequest } from "../../common/parse-or-bad-request.js";
import { CheckoutService } from "./checkout.service.js";

@Controller("checkout")
export class CheckoutController {
  constructor(@Inject(CheckoutService) private readonly checkout: CheckoutService) {}

  @Post()
  create(@Body() body: unknown) {
    const input = parseOrBadRequest(() => parseCreateCheckout(body));
    return this.checkout.checkout(input);
  }
}
