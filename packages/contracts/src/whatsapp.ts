import { z } from "zod";

/**
 * WhatsApp deep-link builder input.
 * No PII in the URL — only catalog references / public SKUs / modality / price label.
 */
export const WhatsAppCatalogMessageSchema = z
  .object({
    planSlug: z.string().max(80).optional(),
    planId: z.string().max(80).optional(),
    kitSlug: z.string().max(80).optional(),
    productSku: z.string().max(80).optional(),
    modality: z.enum(["MONTHLY", "ANNUAL", "PERPETUAL"]).optional(),
    priceLabel: z.string().max(80).optional(),
    utmSource: z.string().max(40).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const refs = [value.planSlug, value.kitSlug, value.productSku, value.planId].filter(Boolean);
    if (refs.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one catalog reference is required" });
    }
  });

export type WhatsAppCatalogMessageInput = z.infer<typeof WhatsAppCatalogMessageSchema>;
