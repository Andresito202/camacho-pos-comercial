import { Inject, Controller, Get, Query } from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";
import { AppConfigService } from "../../config/config.service.js";

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
  listPlans(@Query("includeDraft") includeDraft?: string) {
    if (this.allowDraftPreview(includeDraft)) {
      return this.catalog.listPlans();
    }
    return this.catalog.listPublishedPlans();
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
