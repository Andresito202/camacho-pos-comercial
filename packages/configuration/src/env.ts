import { z } from "zod";

const boolFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  });

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3100),
    DATABASE_URL: z.string().min(1),

    CENTRAL_AUTHORITY_ORIGIN: z.string().url().optional().or(z.literal("")),
    CENTRAL_SESSION_BRIDGE_ENABLED: boolFromEnv.default(false),

    FACTUS_PAY_MODE: z.enum(["SANDBOX", "PRODUCTION"]).default("SANDBOX"),
    FACTUS_PAY_SANDBOX_ENABLED: boolFromEnv.default(true),
    FACTUS_PAY_PRODUCTION_ENABLED: boolFromEnv.default(false),
    FACTUS_PAY_SANDBOX_BASE_URL: z.string().url().default("https://pay-api-sandbox.factus.com.co"),
    FACTUS_PAY_PRODUCTION_BASE_URL: z.string().url().default("https://pay-api.factus.com.co"),
    FACTUS_PAY_SANDBOX_CLIENT_ID: z.string().optional().default(""),
    FACTUS_PAY_SANDBOX_CLIENT_SECRET: z.string().optional().default(""),
    FACTUS_PAY_SANDBOX_WEBHOOK_KEY: z.string().optional().default(""),
    FACTUS_PAY_PRODUCTION_CLIENT_ID: z.string().optional().default(""),
    FACTUS_PAY_PRODUCTION_CLIENT_SECRET: z.string().optional().default(""),
    FACTUS_PAY_PRODUCTION_WEBHOOK_KEY: z.string().optional().default(""),
    FACTUS_PAY_USE_CENTRAL_GATEWAY: boolFromEnv.default(false),
    CENTRAL_FACTUS_PAY_GATEWAY_PATH: z.string().default("/v1/subscriptions/factus-pay/collections"),

    WHATSAPP_BUSINESS_NUMBER: z.string().default("573000000000_DEV_PLACEHOLDER"),
    PUBLIC_SITE_ORIGIN: z.string().url().default("https://camachoposcolombia.com"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (env.FACTUS_PAY_MODE === "PRODUCTION" && !env.FACTUS_PAY_PRODUCTION_ENABLED) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PRODUCTION Factus Pay requires FACTUS_PAY_PRODUCTION_ENABLED=true",
          path: ["FACTUS_PAY_PRODUCTION_ENABLED"],
        });
      }
      if (env.FACTUS_PAY_MODE === "PRODUCTION") {
        if (!env.FACTUS_PAY_PRODUCTION_CLIENT_ID || !env.FACTUS_PAY_PRODUCTION_CLIENT_SECRET) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PRODUCTION Factus Pay credentials required when NODE_ENV=production and mode=PRODUCTION",
            path: ["FACTUS_PAY_PRODUCTION_CLIENT_ID"],
          });
        }
        if (!env.FACTUS_PAY_PRODUCTION_WEBHOOK_KEY || env.FACTUS_PAY_PRODUCTION_WEBHOOK_KEY.length < 32) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "PRODUCTION webhook key must be at least 32 characters",
            path: ["FACTUS_PAY_PRODUCTION_WEBHOOK_KEY"],
          });
        }
      }
      if (env.WHATSAPP_BUSINESS_NUMBER.includes("DEV_PLACEHOLDER")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WhatsApp DEV placeholder is not allowed in production",
          path: ["WHATSAPP_BUSINESS_NUMBER"],
        });
      }
    }
  });

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  return EnvSchema.parse(source);
}

export function isFactusSandboxMockAllowed(env: AppEnv): boolean {
  if (env.NODE_ENV === "production") return false;
  if (env.FACTUS_PAY_MODE !== "SANDBOX") return false;
  const hasCreds =
    Boolean(env.FACTUS_PAY_SANDBOX_CLIENT_ID) && Boolean(env.FACTUS_PAY_SANDBOX_CLIENT_SECRET);
  // Mock only when credentials missing and not production.
  return !hasCreds && env.FACTUS_PAY_SANDBOX_ENABLED;
}

export function resolveWebhookKey(env: AppEnv): string | null {
  if (env.FACTUS_PAY_MODE === "PRODUCTION") {
    return env.FACTUS_PAY_PRODUCTION_WEBHOOK_KEY || null;
  }
  return env.FACTUS_PAY_SANDBOX_WEBHOOK_KEY || null;
}
