import { Inject, Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { CreateSupportTicketSchema } from "@camacho-pos-comercial/contracts";
import { SupportService } from "./support.service.js";

@Controller("support/tickets")
export class SupportController {
  constructor(@Inject(SupportService) private readonly support: SupportService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.support.createTicket(CreateSupportTicketSchema.parse(body));
  }

  @Get(":id")
  get(
    @Param("id") id: string,
    @Query("token") token?: string,
    @Headers("x-ticket-access-token") headerToken?: string,
  ) {
    // Prefer header; query kept only for transitional clients — still requires secret token.
    return this.support.getTicket(id, headerToken || token);
  }
}
