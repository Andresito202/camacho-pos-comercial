import { Inject, Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { MoneyCentsSchema } from "@camacho-pos-comercial/contracts";
import { AdminGuard } from "../../common/auth/admin.guard.js";
import { CatalogService } from "../catalog/catalog.service.js";
import { AuditService } from "../audit/audit.service.js";
import type { BridgedSession } from "../../common/auth/session-bridge.service.js";

const UpdatePriceSchema = z
  .object({
    amountCents: MoneyCentsSchema,
    publish: z.boolean().optional().default(false),
  })
  .strict();

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  @Get("catalog/plans")
  listPlans() {
    return this.catalog.listPlans();
  }

  @Get("catalog/kits")
  listKits() {
    return this.catalog.listKits();
  }

  /** Stub surfaces for web admin nav — GLOBAL gate already applied. */
  @Get("pedidos")
  listOrders() {
    return [];
  }

  @Get("pagos")
  listPayments() {
    return [];
  }

  @Get("clientes")
  listCustomers() {
    return [];
  }

  @Get("contenidos")
  listContents() {
    return [];
  }

  @Get("promociones")
  listPromotions() {
    return [];
  }

  @Get("ajustes")
  listSettings() {
    return [];
  }

  @Patch("catalog/plan-prices/:id")
  async updatePlanPrice(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { commercialSession?: BridgedSession },
  ) {
    const input = UpdatePriceSchema.parse(body);
    const session = req.commercialSession!;
    const updated = await this.catalog.updatePlanPriceAmount({
      planPriceId: id,
      amountCents: input.amountCents,
      adminId: session.subjectId ?? "unknown",
      publish: input.publish,
    });
    await this.audit.record({
      actorType: "ADMIN",
      actorId: session.subjectId,
      action: "PLAN_PRICE_UPDATED",
      entityType: "PlanPrice",
      entityId: updated.id,
      metadata: { amountCents: input.amountCents, publish: input.publish, version: updated.version },
    });
    return updated;
  }
}
