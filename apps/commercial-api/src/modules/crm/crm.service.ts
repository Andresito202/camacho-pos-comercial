import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import type {
  ContactRequestSchema,
  DemoRequestSchema,
  LeadCreateSchema,
  TrialRequestSchema,
} from "@camacho-pos-comercial/contracts";
import type { z } from "zod";
import { PRISMA } from "../../common/prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";
import { AuditService } from "../audit/audit.service.js";

type ContactInput = z.infer<typeof ContactRequestSchema>;
type DemoInput = z.infer<typeof DemoRequestSchema>;
type LeadInput = z.infer<typeof LeadCreateSchema>;
type TrialInput = z.infer<typeof TrialRequestSchema>;

const TRIAL_DAYS = 5;
const POS_LICENSE_GAP =
  "El formulario deja el trial en PENDING_ACTIVATION. El reloj de 5 días inicia solo cuando Central confirma la licencia POS (webhook firmado). Bloqueo efectivo de caja requiere revocación/entitlement en pos-platform Central — este portal no simula activaciones.";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function identityKey(email: string, phone?: string | null): string {
  return sha256(`${email.trim().toLowerCase()}|${(phone ?? "").trim()}`);
}

@Injectable()
export class CrmService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
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

    const email = input.email.toLowerCase();
    const idKey = identityKey(email, input.phoneE164);
    const accessToken = randomBytes(32).toString("hex");
    const accessTokenHash = sha256(accessToken);

    // Advisory lock + partial unique index close parallel enrollment TOCTOU.
    const trial = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`trial:${idKey}`}))`;

      const open = await tx.trialEnrollment.findFirst({
        where: {
          deletedAt: null,
          identityKey: idKey,
          status: { in: ["PENDING_ACTIVATION", "ACTIVE"] },
        },
        select: { id: true, status: true },
      });
      if (open) {
        throw new ConflictException({
          code: "TRIAL_ALREADY_OPEN",
          message:
            "Ya existe una prueba abierta para esta identidad. Espera la activación Central o el vencimiento/bloqueo antes de solicitar otra.",
        });
      }

      const recent = await tx.trialEnrollment.count({
        where: {
          identityKey: idKey,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          deletedAt: null,
        },
      });
      if (recent >= 3) {
        throw new ConflictException({
          code: "TRIAL_ABUSE_LIMIT",
          message: "Se alcanzó el límite de solicitudes de prueba para esta identidad.",
        });
      }

      const lead = await tx.lead.create({
        data: {
          email,
          fullName: input.fullName,
          phoneE164: input.phoneE164,
          companyName: input.companyName,
          businessType: input.sector,
          source: input.sourcePath ?? "prueba-5-dias",
          status: "QUALIFIED",
          notes: [input.notes, input.city ? `Ciudad: ${input.city}` : null, "Prueba 5 días PENDING_ACTIVATION"].filter(Boolean).join(" | "),
          consentDataTreatment: true,
          activities: {
            create: {
              type: "SYSTEM",
              body: "Trial registrado en PENDING_ACTIVATION. Reloj no iniciado hasta confirmación Central.",
              actorType: "SYSTEM",
            },
          },
        },
      });

      try {
        return await tx.trialEnrollment.create({
          data: {
            leadId: lead.id,
            fullName: input.fullName,
            email,
            phoneE164: input.phoneE164,
            companyName: input.companyName,
            sector: input.sector,
            city: input.city,
            notes: input.notes,
            status: "PENDING_ACTIVATION",
            startsAt: null,
            expiresAt: null,
            accessTokenHash,
            identityKey: idKey,
            consentDataTreatment: true,
            consentTerms: true,
            sourcePath: input.sourcePath ?? "/prueba-5-dias",
          },
        });
      } catch {
        throw new ConflictException({
          code: "TRIAL_ALREADY_OPEN",
          message:
            "Ya existe una prueba abierta para esta identidad. Espera la activación Central o el vencimiento/bloqueo antes de solicitar otra.",
        });
      }
    });

    await this.audit.record({
      actorType: "CUSTOMER",
      action: "TRIAL_ENROLLMENT_CREATED",
      entityType: "TrialEnrollment",
      entityId: trial.id,
      metadata: { status: "PENDING_ACTIVATION", leadId: trial.leadId },
    });

    return {
      id: trial.id,
      leadId: trial.leadId,
      status: trial.status,
      startsAt: null,
      expiresAt: null,
      trialDays: TRIAL_DAYS,
      trialHours: TRIAL_DAYS * 24,
      /** Shown once — store client-side (sessionStorage); never put in URL query. */
      accessToken,
      statusPath: `/prueba-5-dias/estado/${trial.id}`,
      posLicenseProvisioning: {
        activated: false,
        gap: POS_LICENSE_GAP,
      },
    };
  }

  /**
   * Public status read — requires access token. Wrong/missing token → identical 404 (anti-enumeration).
   * Does not leak other customers' PII.
   */
  async getTrialStatus(id: string, accessToken: string | undefined) {
    if (!accessToken || accessToken.length < 16) {
      throw new NotFoundException({ code: "TRIAL_NOT_FOUND" });
    }
    const trial = await this.prisma.trialEnrollment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!trial) throw new NotFoundException({ code: "TRIAL_NOT_FOUND" });

    const expected = Buffer.from(trial.accessTokenHash, "hex");
    const actual = Buffer.from(sha256(accessToken), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new NotFoundException({ code: "TRIAL_NOT_FOUND" });
    }

    const current = await this.applyDurableExpiry(trial);
    return this.serializeTrialPublic(current);
  }

  /**
   * Asks Central to issue a real 120h TRIAL license and callback activate-from-central.
   * Does not simulate activation locally.
   */
  async requestCentralTrialIssue(trialId: string) {
    const origin = this.config.centralOrigin();
    const bridgeKey = this.config.env.COMMERCIAL_BRIDGE_KEY?.trim() ?? "";
    if (!origin) {
      throw new ServiceUnavailableException({ code: "PENDING_CENTRAL_CREDENTIALS" });
    }
    if (!bridgeKey || bridgeKey.length < 32) {
      throw new ServiceUnavailableException({ code: "PENDING_COMMERCIAL_BRIDGE_KEY" });
    }
    const trial = await this.prisma.trialEnrollment.findFirst({
      where: { id: trialId, deletedAt: null },
    });
    if (!trial) throw new NotFoundException({ code: "TRIAL_NOT_FOUND" });
    if (trial.status !== "PENDING_ACTIVATION") {
      throw new ConflictException({
        code: "TRIAL_NOT_PENDING",
        message: `Estado ${trial.status} no solicita emisión Central.`,
      });
    }

    const callbackOrigin =
      process.env.COMMERCIAL_API_PUBLIC_ORIGIN?.replace(/\/$/, "") ||
      `http://127.0.0.1:${this.config.env.PORT}`;

    const response = await fetch(`${origin}/v1/commercial/trial/issue`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-central-commercial-bridge-key": bridgeKey,
      },
      body: JSON.stringify({
        trialId: trial.id,
        email: trial.email,
        companyName: trial.companyName ?? undefined,
        trialHours: 120,
        commercialApiOrigin: callbackOrigin,
        jti: `issue-${trial.id}-${Date.now()}`,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new ServiceUnavailableException({
        code: "CENTRAL_TRIAL_ISSUE_FAILED",
        message: text.slice(0, 500),
      });
    }
    const body = (await response.json()) as {
      centralLicenseRef?: string;
      commercialActivation?: string;
      expiresAt?: string;
      startsAt?: string;
    };
    // Re-read after Central callback (activate-from-central) may have flipped status.
    const refreshed = await this.prisma.trialEnrollment.findFirst({
      where: { id: trial.id, deletedAt: null },
    });
    return {
      central: body,
      trial: refreshed ? this.serializeTrialPublic(refreshed, { includePii: false }) : null,
      callbackOriginUsed: callbackOrigin,
    };
  }

  async assertCentralWebhookKey(webhookKey: string | undefined): Promise<void> {
    const expected = this.config.env.CENTRAL_TRIAL_WEBHOOK_KEY?.trim();
    if (!expected || expected.length < 32) {
      throw new ServiceUnavailableException({
        code: "CENTRAL_TRIAL_WEBHOOK_NOT_CONFIGURED",
        message: "Operación trial Central requiere CENTRAL_TRIAL_WEBHOOK_KEY. No hay simulación local.",
      });
    }
    const provided = webhookKey ?? "";
    const a = createHash("sha256").update(expected).digest();
    const b = createHash("sha256").update(provided).digest();
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException({ code: "CENTRAL_WEBHOOK_FORBIDDEN" });
    }
  }

  /**
   * Central-only activation. Fails closed without CENTRAL_TRIAL_WEBHOOK_KEY.
   * Never activates from local "simulate" paths.
   */
  async activateFromCentral(input: {
    trialId: string;
    webhookKey: string | undefined;
    centralLicenseRef: string;
  }) {
    await this.assertCentralWebhookKey(input.webhookKey);
    if (!input.centralLicenseRef || input.centralLicenseRef.trim().length < 8) {
      throw new BadRequestException({ code: "CENTRAL_LICENSE_REF_REQUIRED" });
    }

    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const licenseRef = input.centralLicenseRef.trim();

    // Conditional update — exactly-once activation under concurrent webhook delivery.
    const claimed = await this.prisma.trialEnrollment.updateMany({
      where: {
        id: input.trialId,
        deletedAt: null,
        status: "PENDING_ACTIVATION",
      },
      data: {
        status: "ACTIVE",
        startsAt,
        expiresAt,
        activatedAt: startsAt,
        activationSource: "CENTRAL_LICENSE_CONFIRMED",
        centralLicenseRef: licenseRef,
      },
    });

    const trial = await this.prisma.trialEnrollment.findFirst({
      where: { id: input.trialId, deletedAt: null },
    });
    if (!trial) throw new NotFoundException({ code: "TRIAL_NOT_FOUND" });

    if (claimed.count === 0) {
      if (trial.status === "ACTIVE" && trial.centralLicenseRef === licenseRef) {
        return this.serializeTrialPublic(trial, { includePii: false });
      }
      if (trial.status === "ACTIVE") {
        return this.serializeTrialPublic(trial, { includePii: false });
      }
      throw new ConflictException({
        code: "TRIAL_NOT_ACTIVATABLE",
        message: `Estado actual ${trial.status} no admite activación.`,
      });
    }

    await this.audit.record({
      actorType: "SYSTEM",
      action: "TRIAL_ACTIVATED_FROM_CENTRAL",
      entityType: "TrialEnrollment",
      entityId: trial.id,
      metadata: {
        centralLicenseRef: licenseRef,
        expiresAt: expiresAt.toISOString(),
        trialHours: TRIAL_DAYS * 24,
      },
    });

    return this.serializeTrialPublic(trial, { includePii: false });
  }

  /** Durable expiry sweep — mark ACTIVE past expiresAt as EXPIRED/BLOCKED. */
  async expireDueTrials() {
    const now = new Date();
    const due = await this.prisma.trialEnrollment.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        expiresAt: { lte: now },
      },
      select: { id: true },
      take: 200,
    });
    let expired = 0;
    for (const row of due) {
      await this.prisma.trialEnrollment.update({
        where: { id: row.id },
        data: {
          status: "EXPIRED",
          blockedAt: now,
          blockedReason:
            "La prueba de 5 días venció automáticamente. El bloqueo de licencia POS en dispositivo requiere revocación Central.",
        },
      });
      await this.audit.record({
        actorType: "SYSTEM",
        action: "TRIAL_EXPIRED",
        entityType: "TrialEnrollment",
        entityId: row.id,
      });
      expired += 1;
    }
    return { expired, scanned: due.length };
  }

  private async applyDurableExpiry<T extends { id: string; status: string; expiresAt: Date | null }>(
    trial: T,
  ): Promise<T> {
    if (trial.status === "ACTIVE" && trial.expiresAt && trial.expiresAt.getTime() <= Date.now()) {
      const updated = await this.prisma.trialEnrollment.update({
        where: { id: trial.id },
        data: {
          status: "EXPIRED",
          blockedAt: new Date(),
          blockedReason:
            "La prueba de 5 días venció automáticamente. El bloqueo de licencia POS en dispositivo requiere revocación Central.",
        },
      });
      await this.audit.record({
        actorType: "SYSTEM",
        action: "TRIAL_EXPIRED",
        entityType: "TrialEnrollment",
        entityId: trial.id,
      });
      return updated as unknown as T;
    }
    return trial;
  }

  private serializeTrialPublic(
    trial: {
      id: string;
      status: string;
      startsAt: Date | null;
      expiresAt: Date | null;
      blockedAt: Date | null;
      blockedReason: string | null;
      fullName: string;
      email: string;
      companyName: string | null;
      activationSource: string | null;
      centralLicenseRef: string | null;
    },
    opts?: { includePii?: boolean },
  ) {
    const expired = trial.status === "EXPIRED" || trial.status === "BLOCKED";
    const pending = trial.status === "PENDING_ACTIVATION";
    const activated = trial.status === "ACTIVE" && Boolean(trial.activationSource === "CENTRAL_LICENSE_CONFIRMED");
    return {
      id: trial.id,
      status: trial.status,
      startsAt: trial.startsAt?.toISOString() ?? null,
      expiresAt: trial.expiresAt?.toISOString() ?? null,
      blockedAt: trial.blockedAt?.toISOString() ?? null,
      blockedReason:
        trial.blockedReason ??
        (expired
          ? "Tu prueba de 5 días finalizó. Contrata un plan para continuar con Camacho POS Colombia."
          : pending
            ? "Pendiente de activación real de licencia POS por Central. El reloj de 5 días aún no corre."
            : null),
      // PII omitted by default on public status — prevents cross-customer scraping.
      ...(opts?.includePii
        ? { fullName: trial.fullName, email: trial.email, companyName: trial.companyName }
        : {}),
      blocked: expired,
      pendingActivation: pending,
      ctaHireHref: "/contratar",
      ctaHireLabel: "Contratar ahora",
      posLicenseProvisioning: {
        activated,
        activationSource: trial.activationSource,
        centralLicenseRefPresent: Boolean(trial.centralLicenseRef),
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
