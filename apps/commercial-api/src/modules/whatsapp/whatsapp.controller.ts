import { Inject, Body, Controller, Post } from "@nestjs/common";
import { WhatsAppCatalogMessageSchema } from "@camacho-pos-comercial/contracts";
import { WhatsappService } from "./whatsapp.service.js";

@Controller("whatsapp")
export class WhatsappController {
  constructor(@Inject(WhatsappService) private readonly whatsapp: WhatsappService) {}

  @Post("catalog-message")
  build(@Body() body: unknown) {
    const input = WhatsAppCatalogMessageSchema.parse(body);
    return this.whatsapp.buildCatalogMessage(input);
  }
}
