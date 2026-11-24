import { Inject, Controller, Get, Query } from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";

@Controller("catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get("plans")
  listPlans(@Query("includeDraft") includeDraft?: string) {
    // Public surface: PUBLISHED only. Draft listing is admin-only.
    if (includeDraft === "1") {
      return this.catalog.listPlans();
    }
    return this.catalog.listPublishedPlans();
  }

  @Get("kits")
  listKits() {
    return this.catalog.listPublishedKits();
  }

  @Get("products")
  listProducts() {
    return this.catalog.listPublishedProducts();
  }
}
