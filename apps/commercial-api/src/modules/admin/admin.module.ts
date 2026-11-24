import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module.js";
import { AdminController } from "./admin.controller.js";

@Module({
  imports: [CatalogModule],
  controllers: [AdminController],
})
export class AdminModule {}
