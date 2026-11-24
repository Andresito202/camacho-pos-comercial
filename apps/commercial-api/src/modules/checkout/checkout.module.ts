import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module.js";
import { PaymentsModule } from "../payments/payments.module.js";
import { ProvisioningModule } from "../provisioning/provisioning.module.js";
import { CheckoutController } from "./checkout.controller.js";
import { CheckoutService } from "./checkout.service.js";

@Module({
  imports: [CartModule, PaymentsModule, ProvisioningModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
