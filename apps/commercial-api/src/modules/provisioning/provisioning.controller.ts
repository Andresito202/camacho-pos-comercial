import { Inject, Controller, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../../common/auth/admin.guard.js";
import { ProvisioningService } from "./provisioning.service.js";

@Controller("provisioning")
export class ProvisioningController {
  constructor(@Inject(ProvisioningService) private readonly provisioning: ProvisioningService) {}

  @Post("worker/run")
  @UseGuards(AdminGuard)
  runWorker() {
    return this.provisioning.processDue();
  }
}
