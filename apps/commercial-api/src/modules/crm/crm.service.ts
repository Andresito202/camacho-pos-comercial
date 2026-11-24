import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import type {
  ContactRequestSchema,
  DemoRequestSchema,
  LeadCreateSchema,
} from "@camacho-pos-comercial/contracts";
import type { z } from "zod";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AuditService } from "../audit/audit.service.js";

type ContactInput = z.infer<typeof ContactRequestSchema>;
type DemoInput = z.infer<typeof DemoRequestSchema>;
type LeadInput = z.infer<typeof LeadCreateSchema>;

@Injectable()
export class CrmService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async createContact(input: ContactInput) {
    const row = await this.prisma.contactRequest.create({
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phoneE164: input.phoneE164,
        companyName: input.companyName,
        message: input.message,
        sourcePath: input.sourcePath,
        status: "NEW",
      },
    });
    await this.prisma.lead.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        phoneE164: input.phoneE164,
        companyName: input.companyName,
        source: input.sourcePath ?? "contact-form",
        status: "NEW",
        notes: input.message,
        activities: {
          create: {
            type: "NOTE",
            body: "Contact request received",
            actorType: "SYSTEM",
          },
        },
      },
    });
    await this.audit.record({
      actorType: "CUSTOMER",
      action: "CONTACT_REQUEST_CREATED",
      entityType: "ContactRequest",
      entityId: row.id,
    });
    return { id: row.id, status: row.status };
  }

  async createDemo(input: DemoInput) {
    const lead = await this.prisma.lead.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        phoneE164: input.phoneE164,
        source: "demo-request",
        status: "DEMO_SCHEDULED",
        notes: input.notes,
        activities: {
          create: { type: "DEMO", body: "Demo requested", actorType: "SYSTEM" },
        },
      },
    });
    const demo = await this.prisma.demoRequest.create({
      data: {
        leadId: lead.id,
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phoneE164: input.phoneE164,
        preferredAt: input.preferredAt ? new Date(input.preferredAt) : null,
        sector: input.sector,
        notes: input.notes,
        status: "DEMO_SCHEDULED",
      },
    });
    return { id: demo.id, leadId: lead.id, status: demo.status };
  }

  async createLead(input: LeadInput) {
    const lead = await this.prisma.lead.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        phoneE164: input.phoneE164,
        companyName: input.companyName,
        source: input.source,
        notes: input.notes,
        status: "NEW",
        activities: {
          create: { type: "SYSTEM", body: "Lead created", actorType: "SYSTEM" },
        },
      },
    });
    return { id: lead.id, status: lead.status };
  }
}
