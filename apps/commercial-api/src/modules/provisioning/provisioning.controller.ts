import { BadRequestException, Body, ForbiddenException, Inject, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../../common/auth/admin.guard.js";
import { z } from "zod";
import type { BridgedSession } from "../../common/auth/session-bridge.service.js";
import { ProvisioningService } from "./provisioning.service.js";

@Controller("provisioning")
export class ProvisioningController {
  constructor(@Inject(ProvisioningService) private readonly provisioning: ProvisioningService) {}

  @Post("orders/:orderId/binding")
  @UseGuards(AdminGuard)
  bindPaidOrder(
    @Param("orderId") orderId: string,
    @Body() body: unknown,
    @Req() req: { commercialSession: BridgedSession },
  ) {
    const input = z.object({
      centralTenantId: z.string().trim().uuid(),
      centralPlanId: z.string().trim().uuid(),
      centralCompanyId: z.string().trim().uuid().optional(),
    }).strict().safeParse(body);
    if (!input.success) throw new BadRequestException({ code: "PROVISION_BINDING_INVALID" });
    const actorId = req.commercialSession.subjectId;
    if (!actorId) throw new ForbiddenException({ code: "PROVISION_ADMIN_ID_REQUIRED" });
    return this.provisioning.bindPaidOrder(
      orderId, actorId, input.data.centralTenantId.toLowerCase(),
      input.data.centralPlanId.toLowerCase(), input.data.centralCompanyId?.toLowerCase(),
    );
  }

  @Post("worker/run")
  @UseGuards(AdminGuard)
  runWorker() {
    return this.provisioning.processDue();
  }
}
