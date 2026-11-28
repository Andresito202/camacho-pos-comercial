import { Inject, Controller, Get, Query } from "@nestjs/common";
import { CoverageService } from "./coverage.service.js";
import { AppConfigService } from "../../config/config.service.js";

@Controller("coverage")
export class CoverageController {
  constructor(
    @Inject(CoverageService) private readonly coverage: CoverageService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  @Get("departments")
  departments() {
    return this.coverage.listDepartments();
  }

  @Get("zones")
  zones(@Query("includeDraft") includeDraft?: string) {
    const allowDraft = !this.config.isProduction && includeDraft !== "0";
    return this.coverage.listZones({ includeDraft: allowDraft });
  }
}
