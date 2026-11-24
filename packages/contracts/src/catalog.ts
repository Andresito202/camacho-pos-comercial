import { z } from "zod";
import { MoneyCentsSchema, CurrencyCodeSchema } from "./money.js";

export const PublicationStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const FeatureCommercialStatusSchema = z.enum([
  "AVAILABLE",
  "IN_CERTIFICATION",
  "COMING_SOON",
  "UNPUBLISHED",
]);
export const BillingIntervalSchema = z.enum(["MONTHLY", "ANNUAL", "ONE_TIME", "PERPETUAL"]);

export const PlanPricePublicSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  billingInterval: BillingIntervalSchema,
  amountCents: MoneyCentsSchema,
  currencyCode: CurrencyCodeSchema,
  publicationStatus: PublicationStatusSchema,
});

export const PlanFeaturePublicSchema = z.object({
  code: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  commercialStatus: FeatureCommercialStatusSchema,
  claimNote: z.string().nullable(),
});

export const PlanPublicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string().nullable(),
  description: z.string(),
  licensesPerUnit: z.number().int().positive(),
  publicationStatus: PublicationStatusSchema,
  features: z.array(PlanFeaturePublicSchema),
  prices: z.array(PlanPricePublicSchema),
});

export const KitPublicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  amountCents: MoneyCentsSchema,
  priceVersion: z.number().int().positive(),
  currencyCode: CurrencyCodeSchema,
  publicationStatus: PublicationStatusSchema,
});

export const ProductPublicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string(),
  kind: z.string(),
  publicationStatus: PublicationStatusSchema,
  variants: z.array(
    z.object({
      id: z.string(),
      sku: z.string(),
      name: z.string(),
      amountCents: MoneyCentsSchema,
      version: z.number().int().positive(),
      publicationStatus: PublicationStatusSchema,
    }),
  ),
});
