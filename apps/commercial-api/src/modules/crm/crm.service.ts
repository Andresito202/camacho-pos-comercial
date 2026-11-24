import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import type {
  ContactRequestSchema,
  DemoRequestSchema,
  LeadCreateSchema,
  TrialRequestSchema,
} from "@camacho-pos-comercial/contracts";
import type { z } from "zod";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AuditService } from "../audit/audit.service.js";

type ContactInput = z.infer<typeof ContactRequestSchema>;
type DemoInput = z.infer<typeof DemoRequestSchema>;
type LeadInput = z.infer<typeof LeadCreateSchema>;
type TrialInput = z.infer<typeof TrialRequestSchema>;

const TRIAL_DAYS = 5;
const POS_LICENSE_GAP =
  "La prueba comercial se registra en el CRM de este portal. La activación de licencia POS en Windows/Android requiere el contrato de aprovisionamiento Central GLOBAL en pos-platform (CENTRAL_AUTHORITY_ORIGIN + endpoint de provisioning). Hasta entonces el trial no desbloquea caja live.";

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
    return this.createTrial({
      fullName: input.fullName,
      email: input.email,
      phoneE164: input.phoneE164,
      sector: input.sector,
      notes: input.notes,
      consentDataTreatment: true,
      consentTerms: true,
      sourcePath: "/solicitar-demo",
    });
  }

  async createTrial(input: TrialInput) {
    if (!input.consentDataTreatment || !input.consentTerms) {
      throw new BadRequestException({
        code: "TRIAL_CONSENT_REQUIRED",
        message: "Debes aceptar tratamiento de datos y condiciones de la prueba.",
      });
    }

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const lead = await this.prisma.lead.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        phoneE164: input.phoneE164,
        companyName: input.companyName,
        businessType: input.sector,
        source: input.sourcePath ?? "prueba-5-dias",
        status: "QUALIFIED",
        notes: [input.notes, input.city ? `Ciudad: ${input.city}` : null, "Prueba 5 días"].filter(Boolean).join(" | "),
        consentDataTreatment: true,
        activities: {
          create: {
            type: "SYSTEM",
            body: `Trial 5 días registrado. Expira ${expiresAt.toISOString()}`,
            actorType: "SYSTEM",
          },
        },
      },
    });

    const trial = await this.prisma.trialEnrollment.create({
      data: {
        leadId: lead.id,
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phoneE164: input.phoneE164,
        companyName: input.companyName,
        sector: input.sector,
        city: input.city,
        notes: input.notes,
        status: "ACTIVE",
        startsAt,
        expiresAt,
        consentDataTreatment: true,
        consentTerms: true,
        sourcePath: input.sourcePath ?? "/prueba-5-dias",
      },
    });

    await this.audit.record({
      actorType: "CUSTOMER",
      action: "TRIAL_ENROLLMENT_CREATED",
      entityType: "TrialEnrollment",
      entityId: trial.id,
      metadata: { expiresAt: expiresAt.toISOString(), leadId: lead.id },
    });

    return {
      id: trial.id,
      leadId: lead.id,
      status: trial.status,
      startsAt: trial.startsAt.toISOString(),
      expiresAt: trial.expiresAt.toISOString(),
      trialDays: TRIAL_DAYS,
      posLicenseProvisioning: {
        activated: false,
        gap: POS_LICENSE_GAP,
      },
    };
  }

  async getTrialStatus(id: string) {
    const trial = await this.prisma.trialEnrollment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!trial) throw new NotFoundException({ code: "TRIAL_NOT_FOUND" });

    let status = trial.status;
    if (status === "ACTIVE" && trial.expiresAt.getTime() <= Date.now()) {
      const updated = await this.prisma.trialEnrollment.update({
        where: { id: trial.id },
        data: {
          status: "EXPIRED",
          blockedAt: new Date(),
          blockedReason: "La prueba de 5 días venció automáticamente.",
        },
      });
      status = updated.status;
      await this.audit.record({
        actorType: "SYSTEM",
        action: "TRIAL_EXPIRED",
        entityType: "TrialEnrollment",
        entityId: trial.id,
      });
      return this.serializeTrial(updated);
    }

    return this.serializeTrial({ ...trial, status });
  }

  private serializeTrial(trial: {
    id: string;
    status: string;
    startsAt: Date;
    expiresAt: Date;
    blockedAt: Date | null;
    blockedReason: string | null;
    fullName: string;
    email: string;
    companyName: string | null;
  }) {
    const expired = trial.status === "EXPIRED" || trial.status === "BLOCKED";
    return {
      id: trial.id,
      status: trial.status,
      startsAt: trial.startsAt.toISOString(),
      expiresAt: trial.expiresAt.toISOString(),
      blockedAt: trial.blockedAt?.toISOString() ?? null,
      blockedReason:
        trial.blockedReason ??
        (expired
          ? "Tu prueba de 5 días finalizó. Contrata un plan para continuar con Camacho POS Colombia."
          : null),
      fullName: trial.fullName,
      email: trial.email,
      companyName: trial.companyName,
      blocked: expired,
      ctaHireHref: "/contratar",
      ctaHireLabel: "Contratar ahora",
      posLicenseProvisioning: {
        activated: false,
        gap: POS_LICENSE_GAP,
      },
    };
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
