import { Module } from "@nestjs/common";
import { ProvisioningService } from "./provisioning.service.js";
import { ProvisioningController } from "./provisioning.controller.js";

@Module({
  controllers: [ProvisioningController],
  providers: [ProvisioningService],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
