import { Module } from "@nestjs/common";
import { ProvisioningModule } from "../provisioning/provisioning.module.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";
import { FactusPayAdapter } from "./factus-pay.adapter.js";
import { FactusPayWebhookController } from "./factus-pay-webhook.controller.js";

@Module({
  imports: [ProvisioningModule],
  controllers: [PaymentsController, FactusPayWebhookController],
  providers: [PaymentsService, FactusPayAdapter],
  exports: [PaymentsService, FactusPayAdapter],
})
export class PaymentsModule {}
