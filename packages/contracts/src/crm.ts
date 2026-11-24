import { z } from "zod";

export const ContactRequestSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    email: z.string().email(),
    phoneE164: z.string().min(8).max(20).optional(),
    companyName: z.string().max(200).optional(),
    message: z.string().min(5).max(4000),
    sourcePath: z.string().max(300).optional(),
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
  })
  .strict();

export const LeadCreateSchema = z
  .object({
    fullName: z.string().min(2).max(200),
    email: z.string().email(),
    phoneE164: z.string().min(8).max(20).optional(),
    companyName: z.string().max(200).optional(),
    source: z.string().max(120).optional(),
    notes: z.string().max(4000).optional(),
  })
  .strict();
