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
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),

    CENTRAL_AUTHORITY_ORIGIN: z.string().url().optional().or(z.literal("")),
    CENTRAL_SESSION_BRIDGE_ENABLED: boolFromEnv.default(false),
    /** Path commercial-api POSTs license outbox payloads to Central. Stub until Central exposes it. */
    CENTRAL_PROVISIONING_PATH: z.string().default("/v1/commercial/provisioning"),
    /**
     * Shared service key with Central commercial portal bridge
     * (`X-Central-Commercial-Bridge-Key`). Required for live provisioning/trial issue calls.
     */
    COMMERCIAL_BRIDGE_KEY: z.string().optional().default(""),
    COMMERCIAL_PROVISIONING_WORKER_ENABLED: boolFromEnv.default(false),

    /**
     * Configured environment intent. Resolved runtime gate is MOCK | SANDBOX | PRODUCTION
     * via `resolveFactusPayGate` (MOCK = sandbox without credentials, non-production only).
     */
    FACTUS_PAY_MODE: z.enum(["SANDBOX", "PRODUCTION"]).default("SANDBOX"),
    FACTUS_PAY_SANDBOX_ENABLED: boolFromEnv.default(true),
    /** Hard kill-switch for real PRODUCTION charges. Default false — keep production charges disabled. */
    FACTUS_PAY_PRODUCTION_ENABLED: boolFromEnv.default(false),
    FACTUS_PAY_SANDBOX_BASE_URL: z.string().url().default("https://pay-api-sandbox.factus.com.co"),
    FACTUS_PAY_PRODUCTION_BASE_URL: z.string().url().default("https://pay-api.factus.com.co"),
    /**
     * Official Factus Pay auth uses email + password (POST /auth).
     * CLIENT_ID / CLIENT_SECRET remain as aliases for the same values (historical naming).
     */
    FACTUS_PAY_SANDBOX_EMAIL: z.string().optional().default(""),
    FACTUS_PAY_SANDBOX_PASSWORD: z.string().optional().default(""),
    FACTUS_PAY_SANDBOX_CLIENT_ID: z.string().optional().default(""),
    FACTUS_PAY_SANDBOX_CLIENT_SECRET: z.string().optional().default(""),
    FACTUS_PAY_SANDBOX_WEBHOOK_KEY: z.string().optional().default(""),
    FACTUS_PAY_PRODUCTION_EMAIL: z.string().optional().default(""),
    FACTUS_PAY_PRODUCTION_PASSWORD: z.string().optional().default(""),
    FACTUS_PAY_PRODUCTION_CLIENT_ID: z.string().optional().default(""),
    FACTUS_PAY_PRODUCTION_CLIENT_SECRET: z.string().optional().default(""),
    FACTUS_PAY_PRODUCTION_WEBHOOK_KEY: z.string().optional().default(""),
    /**
     * Deprecated fallback: accept webhook secret via `?key=` query (log/Referer leak risk).
     * Default false — prefer Authorization: Bearer or X-Factus-Pay-Webhook-Key.
     * Only enable explicitly for legacy Factus provider configs that cannot send headers.
     */
    FACTUS_PAY_WEBHOOK_ALLOW_QUERY_KEY: boolFromEnv.default(false),
    /**
     * When true, collection create is proxied to Central's managed Factus gateway path.
     * Central today keeps that gateway INTERNAL (managed custody) — not a public HTTP API.
     * Leave false unless Central publishes a commercial collection endpoint.
     */
    FACTUS_PAY_USE_CENTRAL_GATEWAY: boolFromEnv.default(false),
    CENTRAL_FACTUS_PAY_GATEWAY_PATH: z.string().default("/v1/subscriptions/factus-pay/collections"),

    WHATSAPP_BUSINESS_NUMBER: z.string().default("573000000000_DEV_PLACEHOLDER"),
    PUBLIC_SITE_ORIGIN: z.string().url().default("https://camachoposcolombia.com"),

    /**
     * OPTIONAL staging-only AdminGuard fixture. NEVER enable in production.
     * When "1" and NODE_ENV !== "production", AdminGuard accepts
     * header `X-Admin-Test-Fixture: GLOBAL_SUPERADMIN` for UI demos without Central.
     * Default: unset / false — fail-closed.
     */
    ALLOW_ADMIN_TEST_FIXTURE: boolFromEnv.default(false),

    /** Cloudflare Turnstile (preferred) — public site key for web + secret for API verify. */
    TURNSTILE_SITE_KEY: z.string().optional().default(""),
    TURNSTILE_SECRET_KEY: z.string().optional().default(""),
    /** Google reCAPTCHA alternative when Turnstile is not configured. */
    RECAPTCHA_SITE_KEY: z.string().optional().default(""),
    RECAPTCHA_SECRET_KEY: z.string().optional().default(""),
    /**
     * When true (default), production refuses CRM/login public posts if no captcha secret is set.
     * Non-production may rely on honeypot + rate limit alone.
     */
    CAPTCHA_REQUIRED_IN_PRODUCTION: boolFromEnv.default(true),

    /**
     * Shared secret for Central → commercial trial activation webhook.
     * Without this secret, activation endpoint fails closed (no local simulation).
     */
    CENTRAL_TRIAL_WEBHOOK_KEY: z.string().optional().default(""),

    /**
     * When true, rate limits use Postgres RateLimitCounter (durable across instances).
     * Default true. Memory fallback only when explicitly disabled for local unit tests.
     */
    RATE_LIMIT_DURABLE: boolFromEnv.default(true),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (env.ALLOW_ADMIN_TEST_FIXTURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ALLOW_ADMIN_TEST_FIXTURE must never be enabled when NODE_ENV=production",
          path: ["ALLOW_ADMIN_TEST_FIXTURE"],
        });
      }
      if (env.FACTUS_PAY_MODE === "PRODUCTION" && !env.FACTUS_PAY_PRODUCTION_ENABLED) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PRODUCTION Factus Pay requires FACTUS_PAY_PRODUCTION_ENABLED=true",
          path: ["FACTUS_PAY_PRODUCTION_ENABLED"],
        });
      }
      if (env.FACTUS_PAY_MODE === "PRODUCTION") {
        const email = resolveFactusEmail(env, "PRODUCTION");
        const password = resolveFactusPassword(env, "PRODUCTION");
        if (!email || !password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "PRODUCTION Factus Pay credentials required (EMAIL/PASSWORD or CLIENT_ID/CLIENT_SECRET aliases)",
            path: ["FACTUS_PAY_PRODUCTION_EMAIL"],
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

/** Runtime gate labels for adapters, logs, and docs. */
export type FactusPayGate = "MOCK" | "SANDBOX" | "PRODUCTION";

export function loadEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  return EnvSchema.parse(source);
}

export function resolveFactusEmail(env: AppEnv, mode: "SANDBOX" | "PRODUCTION"): string {
  if (mode === "PRODUCTION") {
    return (env.FACTUS_PAY_PRODUCTION_EMAIL || env.FACTUS_PAY_PRODUCTION_CLIENT_ID || "").trim();
  }
  return (env.FACTUS_PAY_SANDBOX_EMAIL || env.FACTUS_PAY_SANDBOX_CLIENT_ID || "").trim();
}

export function resolveFactusPassword(env: AppEnv, mode: "SANDBOX" | "PRODUCTION"): string {
  if (mode === "PRODUCTION") {
    return (env.FACTUS_PAY_PRODUCTION_PASSWORD || env.FACTUS_PAY_PRODUCTION_CLIENT_SECRET || "").trim();
  }
  return (env.FACTUS_PAY_SANDBOX_PASSWORD || env.FACTUS_PAY_SANDBOX_CLIENT_SECRET || "").trim();
}

export function hasFactusCredentials(env: AppEnv, mode: "SANDBOX" | "PRODUCTION"): boolean {
  return Boolean(resolveFactusEmail(env, mode) && resolveFactusPassword(env, mode));
}

/**
 * MOCK — labeled local simulator (no provider HTTP). Never allowed when NODE_ENV=production.
 * SANDBOX — real Factus sandbox HTTP with credentials.
 * PRODUCTION — real Factus production; requires FACTUS_PAY_PRODUCTION_ENABLED=true.
 */
export function resolveFactusPayGate(env: AppEnv): FactusPayGate {
  if (env.FACTUS_PAY_MODE === "PRODUCTION") {
    if (!env.FACTUS_PAY_PRODUCTION_ENABLED) {
      throw new Error("FACTUS_PAY_PRODUCTION_DISABLED");
    }
    return "PRODUCTION";
  }
  if (isFactusSandboxMockAllowed(env)) return "MOCK";
  return "SANDBOX";
}

export function isFactusSandboxMockAllowed(env: AppEnv): boolean {
  if (env.NODE_ENV === "production") return false;
  if (env.FACTUS_PAY_MODE !== "SANDBOX") return false;
  // Mock only when credentials missing and sandbox enabled.
  return !hasFactusCredentials(env, "SANDBOX") && env.FACTUS_PAY_SANDBOX_ENABLED;
}

export function resolveWebhookKey(env: AppEnv): string | null {
  if (env.FACTUS_PAY_MODE === "PRODUCTION") {
    return env.FACTUS_PAY_PRODUCTION_WEBHOOK_KEY || null;
  }
  return env.FACTUS_PAY_SANDBOX_WEBHOOK_KEY || null;
}

export function resolveCentralOrigin(env: AppEnv): string | null {
  const origin = env.CENTRAL_AUTHORITY_ORIGIN?.trim();
  return origin ? origin : null;
}
