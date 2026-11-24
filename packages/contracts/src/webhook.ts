import { z } from "zod";
import { MoneyCentsSchema } from "./money.js";

/**
 * FACTUS Pay collection webhook payload (conceptual reuse of Central contracts).
 * Portal path: POST /v1/webhooks/factus-pay/collections
 */
export const FactusPayWebhookBodySchema = z.object({
  data: z.object({
    reference_code: z.string().min(1).max(160),
    amount: z.union([z.string(), z.number()]),
    status: z.literal("paid"),
    payer: z.record(z.unknown()).optional(),
  }),
});

export type FactusPayWebhookBody = z.infer<typeof FactusPayWebhookBodySchema>;

/** Convert FACTUS amount (COP major, possibly decimal string) to integer minor units. */
export function factusAmountToCents(amount: string | number): number {
  const raw = String(amount).trim();
  if (!/^(?:0|[1-9]\d{0,14})(?:\.\d{1,6})?$/.test(raw)) {
    throw new Error("FACTUS_PAY_INVALID_AMOUNT");
  }
  const [whole, fraction = ""] = raw.split(".");
  // Commercial portal stores 1 minor unit = 1 COP peso (no fractional list prices).
  // Accept provider decimals but require fractional part to be zero for reconciliation.
  if (fraction.replace(/0+$/, "").length > 0) {
    throw new Error("FACTUS_PAY_FRACTIONAL_AMOUNT_UNSUPPORTED");
  }
  return MoneyCentsSchema.parse(Number(whole));
}

export const WebhookProcessResultSchema = z.enum(["STORED", "DUPLICATE", "MISMATCH", "NOT_FOUND"]);
export type WebhookProcessResult = z.infer<typeof WebhookProcessResultSchema>;
