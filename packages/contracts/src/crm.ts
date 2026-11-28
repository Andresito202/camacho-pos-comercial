import { z } from "zod";

/**
 * Honeypot field (`website`). Parsed as optional string; the API rejects non-empty
 * values via CaptchaService.assertHoneypotEmpty (BOT_REJECTED), not Zod max(0),
 * so Nest returns a controlled 400 instead of an unhandled Zod 500.
 */
export const HoneypotFieldSchema = z.string().max(200).optional();

export const CaptchaFieldsSchema = z.object({
  /** Cloudflare Turnstile or reCAPTCHA response token when keys are configured. */
  captchaToken: z.string().max(4000).optional(),
  /** Invisible honeypot field name used by forms (`website`). */
  website: HoneypotFieldSchema,
});

export const ContactRequestSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    email: z.string().email(),
    phoneE164: z.string().min(8).max(20).optional(),
    companyName: z.string().max(200).optional(),
    message: z.string().min(5).max(4000),
    sourcePath: z.string().max(300).optional(),
    captchaToken: z.string().max(4000).optional(),
    website: HoneypotFieldSchema,
  })
  .strict();

export const DemoRequestSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    email: z.string().email(),
    phoneE164: z.string().min(8).max(20).optional(),
    preferredAt: z.string().datetime().optional(),
    sector: z.string().max(80).optional(),
    notes: z.string().max(2000).optional(),
    captchaToken: z.string().max(4000).optional(),
    website: HoneypotFieldSchema,
  })
  .strict();

export const TrialRequestSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    email: z.string().email(),
    phoneE164: z.string().min(8).max(20).optional(),
    companyName: z.string().max(200).optional(),
    sector: z.string().max(80).optional(),
    city: z.string().max(120).optional(),
    notes: z.string().max(2000).optional(),
    consentDataTreatment: z.boolean(),
    consentTerms: z.boolean(),
    sourcePath: z.string().max(300).optional(),
    captchaToken: z.string().max(4000).optional(),
    website: HoneypotFieldSchema,
  })
  .strict()
  .refine((value) => value.consentDataTreatment === true, {
    message: "consentDataTreatment is required",
    path: ["consentDataTreatment"],
  })
  .refine((value) => value.consentTerms === true, {
    message: "consentTerms is required",
    path: ["consentTerms"],
  });

export const LeadCreateSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    email: z.string().email(),
    phoneE164: z.string().min(8).max(20).optional(),
    companyName: z.string().max(200).optional(),
    businessType: z.string().max(120).optional(),
    source: z.string().max(120).optional(),
    notes: z.string().max(4000).optional(),
    planId: z.string().max(64).optional(),
    modality: z.enum(["MONTHLY", "ANNUAL", "PERPETUAL"]).optional(),
    solutionType: z.enum(["SOFTWARE", "COMPLETE"]).optional(),
    departmentCode: z.string().max(10).optional(),
    cityCode: z.string().max(10).optional(),
    cajaQty: z.number().int().min(1).max(500).optional(),
    branchQty: z.number().int().min(1).max(500).optional(),
    consentDataTreatment: z.boolean(),
    consentCommercial: z.boolean().optional().default(false),
    captchaToken: z.string().max(4000).optional(),
    website: HoneypotFieldSchema,
  })
  .strict()
  .refine((value) => value.consentDataTreatment === true, {
    message: "consentDataTreatment is required",
    path: ["consentDataTreatment"],
  });
