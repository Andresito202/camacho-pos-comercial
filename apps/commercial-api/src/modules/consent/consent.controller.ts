import { Inject, Body, Controller, Post } from "@nestjs/common";
import { ConsentRecordSchema } from "@camacho-pos-comercial/contracts";
import { ConsentService } from "./consent.service.js";

@Controller("consent")
export class ConsentController {
  constructor(@Inject(ConsentService) private readonly consent: ConsentService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.consent.record(ConsentRecordSchema.parse(body));
  }
}
