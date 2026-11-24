import { z } from "zod";

/** Integer COP minor units (1 unit = 1 COP peso). Never float. */
export const MoneyCentsSchema = z
  .number()
  .int("Money must be an integer (COP minor units)")
  .nonnegative("Money cannot be negative")
  .max(50_000_000_000, "Money exceeds commercial portal hard cap");

export type MoneyCents = z.infer<typeof MoneyCentsSchema>;

export const CurrencyCodeSchema = z.literal("COP");

export function assertMoneyCents(value: unknown): MoneyCents {
  return MoneyCentsSchema.parse(value);
}

/** Reject any client-supplied total; server is sole authority. */
export function rejectClientTotals(body: Record<string, unknown>): void {
  const forbidden = ["totalCents", "subtotalCents", "discountCents", "shippingCents", "taxCents", "total", "subtotal"] as const;
  for (const key of forbidden) {
    if (key in body && body[key] !== undefined) {
      throw new Error("CLIENT_TOTALS_REJECTED");
    }
  }
}

export function lineTotal(unitAmountCents: MoneyCents, quantity: number): MoneyCents {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10_000) {
    throw new Error("INVALID_QUANTITY");
  }
  const total = unitAmountCents * quantity;
  return MoneyCentsSchema.parse(total);
}
