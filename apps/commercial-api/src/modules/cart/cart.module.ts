import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module.js";
import { PromotionsModule } from "../promotions/promotions.module.js";
import { CartController } from "./cart.controller.js";
import { CartService } from "./cart.service.js";

@Module({
  imports: [CatalogModule, PromotionsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
