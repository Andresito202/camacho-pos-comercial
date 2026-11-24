import { Inject, Controller, Get, Query } from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";
import { AppConfigService } from "../../config/config.service.js";

/** Codes kept out of public plan bullets (architecture / payment internals). */
const HIDDEN_PUBLIC_FEATURE_CODES = new Set(["sqlite_single_writer", "factus_pay"]);

function sanitizePlanForPublic<T extends { features?: Array<Record<string, unknown>> }>(plan: T) {
  const features = (plan.features ?? [])
    .filter((feature) => {
      const code = typeof feature.code === "string" ? feature.code : "";
      return !HIDDEN_PUBLIC_FEATURE_CODES.has(code);
    })
    .map((feature) => {
      const { claimNote: _claimNote, ...rest } = feature;
      return rest;
    });
  return { ...plan, features };
}

@Controller("catalog")
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  /** Non-production: DRAFT visible for preview. Production: PUBLISHED only (purchase still enforces PUBLISHED). */
  private allowDraftPreview(includeDraft?: string): boolean {
    if (this.config.isProduction) return false;
    return includeDraft !== "0";
  }

  @Get("plans")
  async listPlans(@Query("includeDraft") includeDraft?: string) {
    const plans = this.allowDraftPreview(includeDraft)
      ? await this.catalog.listPlans()
      : await this.catalog.listPublishedPlans();
    return plans.map((plan) => sanitizePlanForPublic(plan));
  }

  @Get("kits")
  listKits(@Query("includeDraft") includeDraft?: string) {
    if (this.allowDraftPreview(includeDraft)) {
      return this.catalog.listKits();
    }
    return this.catalog.listPublishedKits();
  }

  @Get("products")
  listProducts(@Query("includeDraft") includeDraft?: string) {
    if (this.allowDraftPreview(includeDraft)) {
      return this.catalog.listProducts();
    }
    return this.catalog.listPublishedProducts();
  }
}
