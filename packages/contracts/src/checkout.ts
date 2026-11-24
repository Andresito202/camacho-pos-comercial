import { z } from "zod";
import { rejectClientTotals } from "./money.js";

export const CheckoutCustomerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(200),
  phoneE164: z.string().min(8).max(20).optional(),
  documentType: z.string().max(20).optional(),
  documentNumber: z.string().max(40).optional(),
});

export const CheckoutBusinessSchema = z.object({
  legalName: z.string().min(2).max(200),
  tradeName: z.string().max(200).optional(),
  nit: z.string().max(30).optional(),
  cityCode: z.string().max(10).optional(),
  departmentCode: z.string().max(10).optional(),
  addressLine: z.string().max(300).optional(),
  sector: z.string().max(80).optional(),
  cajaCount: z.number().int().min(1).max(500).default(1),
});

export const CreateCheckoutSchema = z
  .object({
    cartSessionToken: z.string().min(10),
    idempotencyKey: z.string().min(8).max(128),
    customer: CheckoutCustomerSchema,
    business: CheckoutBusinessSchema.optional(),
    coverageZoneId: z.string().optional(),
  })
  .strict();

export type CreateCheckoutInput = z.infer<typeof CreateCheckoutSchema>;

export function parseCreateCheckout(body: unknown): CreateCheckoutInput {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    rejectClientTotals(body as Record<string, unknown>);
  }
  return CreateCheckoutSchema.parse(body);
}

export const OrderViewSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  totalCents: z.number().int().nonnegative(),
  currencyCode: z.literal("COP"),
  paymentReference: z.string().nullable(),
});
