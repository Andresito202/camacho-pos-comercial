import { BadRequestException, Inject, Injectable } from "@nestjs/common";
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
        consentDataTreatment: true,
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
        consentDataTreatment: true,
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
    if (!input.consentDataTreatment) {
      throw new BadRequestException({
        code: "CONSENT_DATA_TREATMENT_REQUIRED",
        message: "Se requiere consentimiento de tratamiento de datos.",
      });
    }

    if (input.planId) {
      const plan = await this.prisma.plan.findFirst({
        where: { id: input.planId, deletedAt: null },
        select: { id: true },
      });
      if (!plan) {
        throw new BadRequestException({ code: "PLAN_NOT_FOUND" });
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        phoneE164: input.phoneE164,
        companyName: input.companyName,
        businessType: input.businessType,
        source: input.source ?? "hire-modal",
        notes: input.notes,
        status: "NEW",
        planId: input.planId,
        modality: input.modality,
        solutionType: input.solutionType,
        departmentCode: input.departmentCode,
        cityCode: input.cityCode,
        cajaQty: input.cajaQty,
        branchQty: input.branchQty,
        consentDataTreatment: input.consentDataTreatment,
        consentCommercial: input.consentCommercial ?? false,
        activities: {
          create: {
            type: "SYSTEM",
            body: [
              "Lead created from hire flow",
              input.planId ? `planId=${input.planId}` : null,
              input.modality ? `modality=${input.modality}` : null,
              input.solutionType ? `solutionType=${input.solutionType}` : null,
            ]
              .filter(Boolean)
              .join(" | "),
            actorType: "SYSTEM",
          },
        },
      },
    });

    await this.audit.record({
      actorType: "CUSTOMER",
      action: "LEAD_CREATED",
      entityType: "Lead",
      entityId: lead.id,
      metadata: {
        planId: lead.planId,
        modality: lead.modality,
        solutionType: lead.solutionType,
      },
    });

    return {
      id: lead.id,
      status: lead.status,
      planId: lead.planId,
      modality: lead.modality,
      solutionType: lead.solutionType,
    };
  }
}
