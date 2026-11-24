import { z } from "zod";
import { MoneyCentsSchema, CurrencyCodeSchema, rejectClientTotals } from "./money.js";

export const AddCartItemSchema = z
  .object({
    planPriceId: z.string().min(1).optional(),
    productVariantId: z.string().min(1).optional(),
    kitId: z.string().min(1).optional(),
    quantity: z.number().int().min(1).max(100).default(1),
    /** Client must send the priced entity version; mismatch → reject (tamper / stale). */
    expectedPriceVersion: z.number().int().positive(),
    expectedUnitAmountCents: MoneyCentsSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const targets = [value.planPriceId, value.productVariantId, value.kitId].filter(Boolean);
    if (targets.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one of planPriceId, productVariantId, kitId is required",
      });
    }
  });

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;

export const ApplyCouponSchema = z
  .object({
    code: z.string().min(1).max(64),
  })
  .strict();

export const CartTotalsSchema = z.object({
  currencyCode: CurrencyCodeSchema,
  subtotalCents: MoneyCentsSchema,
  discountCents: MoneyCentsSchema,
  shippingCents: MoneyCentsSchema,
  taxCents: MoneyCentsSchema,
  totalCents: MoneyCentsSchema,
});

export const CartItemViewSchema = z.object({
  id: z.string(),
  label: z.string(),
  quantity: z.number().int().positive(),
  unitAmountCents: MoneyCentsSchema,
  lineTotalCents: MoneyCentsSchema,
  priceVersion: z.number().int().positive(),
  planPriceId: z.string().nullable(),
  productVariantId: z.string().nullable(),
  kitId: z.string().nullable(),
});

export const CartViewSchema = z.object({
  id: z.string(),
  sessionToken: z.string(),
  status: z.string(),
  couponCode: z.string().nullable(),
  items: z.array(CartItemViewSchema),
  totals: CartTotalsSchema,
});

export function parseAddCartItem(body: unknown): AddCartItemInput {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    rejectClientTotals(body as Record<string, unknown>);
  }
  return AddCartItemSchema.parse(body);
}
