import { Inject, Body, Controller, Post } from "@nestjs/common";
import {
  ContactRequestSchema,
  DemoRequestSchema,
  LeadCreateSchema,
} from "@camacho-pos-comercial/contracts";
import { CrmService } from "./crm.service.js";

@Controller("crm")
export class CrmController {
  constructor(@Inject(CrmService) private readonly crm: CrmService) {}

  @Post("contact")
  contact(@Body() body: unknown) {
    return this.crm.createContact(ContactRequestSchema.parse(body));
  }

  @Post("demo")
  demo(@Body() body: unknown) {
    return this.crm.createDemo(DemoRequestSchema.parse(body));
  }

  @Post("leads")
  leads(@Body() body: unknown) {
    return this.crm.createLead(LeadCreateSchema.parse(body));
  }
}
