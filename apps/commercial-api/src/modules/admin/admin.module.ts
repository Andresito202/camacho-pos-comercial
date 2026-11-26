import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module.js";
import { ContentModule } from "../content/content.module.js";
import { PromotionsModule } from "../promotions/promotions.module.js";
import { SupportModule } from "../support/support.module.js";
import { AdminController } from "./admin.controller.js";

@Module({
  imports: [CatalogModule, ContentModule, PromotionsModule, SupportModule],
  controllers: [AdminController],
})
export class AdminModule {}
