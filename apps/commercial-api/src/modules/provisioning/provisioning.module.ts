import { Module } from "@nestjs/common";
import { ProvisioningService } from "./provisioning.service.js";
import { ProvisioningController } from "./provisioning.controller.js";
import { ProvisioningScheduler } from "./provisioning-scheduler.js";

@Module({
  controllers: [ProvisioningController],
  providers: [ProvisioningService, ProvisioningScheduler],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
