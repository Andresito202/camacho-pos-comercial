import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateImageUploadMeta, validatePublicImageUrl } from "../src/common/security/file-validation.js";

process.env.NODE_ENV = "test";
process.env.PORT = "3111";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://comercial:comercial_dev@127.0.0.1:5432/camacho_pos_comercial?schema=public";
process.env.FACTUS_PAY_MODE = "SANDBOX";
process.env.FACTUS_PAY_SANDBOX_ENABLED = "true";
process.env.FACTUS_PAY_SANDBOX_WEBHOOK_KEY = "dev_sandbox_webhook_key_min_32_chars_xx";
process.env.FACTUS_PAY_PRODUCTION_ENABLED = "false";
process.env.CENTRAL_AUTHORITY_ORIGIN = "";
process.env.CENTRAL_SESSION_BRIDGE_ENABLED = "false";
process.env.WHATSAPP_BUSINESS_NUMBER = "573000000000_DEV_PLACEHOLDER";
process.env.PUBLIC_SITE_ORIGIN = "https://camachoposcolombia.com";
process.env.RATE_LIMIT_DURABLE = "true";
process.env.CAPTCHA_REQUIRED_IN_PRODUCTION = "false";
process.env.TURNSTILE_SECRET_KEY = "test-turnstile-secret";
process.env.TURNSTILE_SITE_KEY = "test-turnstile-site";
process.env.CENTRAL_TRIAL_WEBHOOK_KEY = ""; // fail-closed activation

describe("security negatives — trial, captcha, files", () => {
  let app: import("@nestjs/platform-fastify").NestFastifyApplication;
  let prisma: import("@camacho-pos-comercial/database").PrismaClient;
  let captcha: import("../src/common/security/captcha.service.js").CaptchaService;

  beforeAll(async () => {
    const { NestFactory } = await import("@nestjs/core");
    const { FastifyAdapter } = await import("@nestjs/platform-fastify");
    const { PrismaClient } = await import("@camacho-pos-comercial/database");
    const { AppModule } = await import("../src/app.module.js");
    const { CaptchaService } = await import("../src/common/security/captcha.service.js");

    prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    await prisma.$connect();

    app = await NestFactory.create(
      AppModule,
      new FastifyAdapter({ logger: false }),
    );
    app.setGlobalPrefix("v1", { exclude: ["health"] });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    captcha = app.get(CaptchaService);
    captcha.verifyFn = async (_provider, token) => {
      if (token === "valid-token-aaaaaaaa") return { success: true };
      if (token === "expired-token-bbbbbbbb") {
        return { success: false, errorCodes: ["timeout-or-duplicate"] };
      }
      return { success: false, errorCodes: ["invalid-input-response"] };
    };
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("rejects honeypot-filled contact", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/crm/contact",
      payload: {
        fullName: "Bot",
        email: "bot@example.com",
        message: "spam content here",
        website: "http://evil.example",
        captchaToken: "valid-token-aaaaaaaa",
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("BOT_REJECTED");
  });

  it("rejects invalid captcha token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/crm/contact",
      payload: {
        fullName: "Persona",
        email: "persona@example.com",
        message: "hola necesito info",
        website: "",
        captchaToken: "invalid-token-xxxxxxxx",
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("CAPTCHA_FAILED");
  });

  it("rejects expired captcha token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/crm/contact",
      payload: {
        fullName: "Persona",
        email: "persona2@example.com",
        message: "hola necesito info",
        website: "",
        captchaToken: "expired-token-bbbbbbbb",
      },
    });
    expect(res.statusCode).toBe(400);
    expect(["CAPTCHA_EXPIRED", "CAPTCHA_FAILED"]).toContain(res.json().code);
  });

  it("rejects reused captcha token", async () => {
    const token = `reuse-token-${Date.now()}-cccccccc`;
    captcha.verifyFn = async () => ({ success: true });
    const payload = {
      fullName: "Persona",
      email: `reuse.${Date.now()}@example.com`,
      message: "primer intento valido",
      website: "",
      captchaToken: token,
    };
    const first = await app.inject({ method: "POST", url: "/v1/crm/contact", payload });
    expect(first.statusCode).toBeLessThan(300);

    const second = await app.inject({
      method: "POST",
      url: "/v1/crm/contact",
      payload: { ...payload, email: `reuse2.${Date.now()}@example.com` },
    });
    expect(second.statusCode).toBe(400);
    expect(second.json().code).toBe("CAPTCHA_REUSED");
  });

  it("creates trial as PENDING_ACTIVATION without starting clock", async () => {
    captcha.verifyFn = async () => ({ success: true });
    const email = `trial.pending.${Date.now()}@example.com`;
    const res = await app.inject({
      method: "POST",
      url: "/v1/crm/trial",
      payload: {
        fullName: "Trial User",
        email,
        phoneE164: "+573001110001",
        companyName: "Negocio",
        consentDataTreatment: true,
        consentTerms: true,
        website: "",
        captchaToken: `trial-token-${Date.now()}-dddddddd`,
      },
    });
    expect(res.statusCode).toBeLessThan(300);
    const body = res.json();
    expect(body.status).toBe("PENDING_ACTIVATION");
    expect(body.startsAt).toBeNull();
    expect(body.expiresAt).toBeNull();
    expect(body.accessToken).toBeTruthy();
    expect(body.posLicenseProvisioning.activated).toBe(false);
  });

  it("rejects duplicate open trial for same identity", async () => {
    captcha.verifyFn = async () => ({ success: true });
    const email = `trial.dup.${Date.now()}@example.com`;
    const phone = "+573001110002";
    const base = {
      fullName: "Dup User",
      email,
      phoneE164: phone,
      companyName: "Negocio",
      consentDataTreatment: true,
      consentTerms: true,
      website: "",
    };
    const first = await app.inject({
      method: "POST",
      url: "/v1/crm/trial",
      payload: { ...base, captchaToken: `dup-a-${Date.now()}-eeeeeeee` },
    });
    expect(first.statusCode).toBeLessThan(300);
    const second = await app.inject({
      method: "POST",
      url: "/v1/crm/trial",
      payload: { ...base, captchaToken: `dup-b-${Date.now()}-ffffffff` },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().code).toBe("TRIAL_ALREADY_OPEN");
  });

  it("hides trial status without token (anti-enumeration; no query token)", async () => {
    captcha.verifyFn = async () => ({ success: true });
    const created = await app.inject({
      method: "POST",
      url: "/v1/crm/trial",
      payload: {
        fullName: "Enum User",
        email: `trial.enum.${Date.now()}@example.com`,
        phoneE164: "+573001110003",
        companyName: "Negocio",
        consentDataTreatment: true,
        consentTerms: true,
        website: "",
        captchaToken: `enum-token-${Date.now()}-gggggggg`,
      },
    });
    const id = created.json().id as string;
    expect(String(created.json().statusPath ?? "")).not.toContain("token=");
    const missing = await app.inject({ method: "GET", url: `/v1/crm/trial/${id}` });
    expect(missing.statusCode).toBe(404);
    const queryIgnored = await app.inject({
      method: "GET",
      url: `/v1/crm/trial/${id}?token=${created.json().accessToken}`,
    });
    expect(queryIgnored.statusCode).toBe(404);
    const wrong = await app.inject({
      method: "GET",
      url: `/v1/crm/trial/${id}`,
      headers: { "x-trial-access-token": "deadbeefdeadbeefdeadbeefdeadbeef" },
    });
    expect(wrong.statusCode).toBe(404);
    const ok = await app.inject({
      method: "GET",
      url: `/v1/crm/trial/${id}`,
      headers: { "x-trial-access-token": created.json().accessToken },
    });
    expect(ok.statusCode).toBeLessThan(300);
    const body = ok.json();
    expect(body.email).toBeUndefined();
    expect(body.fullName).toBeUndefined();
    expect(body.status).toBe("PENDING_ACTIVATION");
  });

  it("blocks concurrent duplicate open trials for same identity", async () => {
    captcha.verifyFn = async () => ({ success: true });
    const email = `trial.race.${Date.now()}@example.com`;
    const phone = "+573001110099";
    const mk = (n: number) =>
      app.inject({
        method: "POST",
        url: "/v1/crm/trial",
        payload: {
          fullName: "Race User",
          email,
          phoneE164: phone,
          companyName: "Negocio",
          consentDataTreatment: true,
          consentTerms: true,
          website: "",
          captchaToken: `race-token-${Date.now()}-${n}-iiiiiiii`,
        },
      });
    const [a, b] = await Promise.all([mk(1), mk(2)]);
    const codes = [a.statusCode, b.statusCode].sort();
    expect(codes[0]).toBeLessThan(300);
    expect(codes[1]).toBe(409);
    const openCount = await prisma.trialEnrollment.count({
      where: {
        email,
        deletedAt: null,
        status: { in: ["PENDING_ACTIVATION", "ACTIVE"] },
      },
    });
    expect(openCount).toBe(1);
  });

  it("refuses unauthenticated trial expire-due", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/crm/trial/expire-due" });
    expect([403, 503]).toContain(res.statusCode);
  });

  it("blocks support ticket IDOR without access token", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/support/tickets",
      payload: {
        email: `ticket.${Date.now()}@example.com`,
        subject: "Ayuda con licencia",
        body: "No puedo activar la caja de prueba",
        priority: "NORMAL",
      },
    });
    expect(created.statusCode).toBeLessThan(300);
    const id = created.json().id as string;
    const token = created.json().accessToken as string;
    expect(token).toBeTruthy();
    const naked = await app.inject({ method: "GET", url: `/v1/support/tickets/${id}` });
    expect(naked.statusCode).toBe(404);
    const ok = await app.inject({
      method: "GET",
      url: `/v1/support/tickets/${id}`,
      headers: { "x-ticket-access-token": token },
    });
    expect(ok.statusCode).toBeLessThan(300);
    expect(ok.json().email).toBeUndefined();
  });

  it("rejects captcha claim race (parallel identical token)", async () => {
    captcha.verifyFn = async () => {
      await new Promise((r) => setTimeout(r, 30));
      return { success: true };
    };
    const token = `parallel-token-${Date.now()}-jjjjjjjj`;
    const payload = {
      fullName: "Parallel",
      email: `par.${Date.now()}@example.com`,
      message: "mensaje de contacto paralelo",
      website: "",
      captchaToken: token,
    };
    const [a, b] = await Promise.all([
      app.inject({ method: "POST", url: "/v1/crm/contact", payload }),
      app.inject({
        method: "POST",
        url: "/v1/crm/contact",
        payload: { ...payload, email: `par2.${Date.now()}@example.com` },
      }),
    ]);
    const ok = [a, b].filter((r) => r.statusCode < 300).length;
    const reused = [a, b].filter((r) => r.statusCode === 400 && r.json().code === "CAPTCHA_REUSED").length;
    expect(ok).toBe(1);
    expect(reused).toBe(1);
  });

  it("rejects Factus Pay webhook with wrong key (header and query)", async () => {
    const payload = {
      data: { reference_code: `ref-bad-${Date.now()}`, amount: 1000, status: "paid" },
    };
    const viaHeader = await app.inject({
      method: "POST",
      url: "/v1/webhooks/factus-pay/collections",
      headers: { "x-factus-pay-webhook-key": "wrong_key_not_matching_expected_value" },
      payload,
    });
    expect(viaHeader.statusCode).toBe(401);
    expect(viaHeader.json().code).toBe("FACTUS_PAY_UNAUTHORIZED");

    const viaQuery = await app.inject({
      method: "POST",
      url: "/v1/webhooks/factus-pay/collections?key=wrong_key_not_matching_expected_value",
      payload,
    });
    expect(viaQuery.statusCode).toBe(401);
    expect(viaQuery.json().code).toBe("FACTUS_PAY_UNAUTHORIZED");
  });

  it("refuses local activation without CENTRAL_TRIAL_WEBHOOK_KEY", async () => {
    captcha.verifyFn = async () => ({ success: true });
    const created = await app.inject({
      method: "POST",
      url: "/v1/crm/trial",
      payload: {
        fullName: "Act User",
        email: `trial.act.${Date.now()}@example.com`,
        phoneE164: "+573001110004",
        companyName: "Negocio",
        consentDataTreatment: true,
        consentTerms: true,
        website: "",
        captchaToken: `act-token-${Date.now()}-hhhhhhhh`,
      },
    });
    const id = created.json().id as string;
    const res = await app.inject({
      method: "POST",
      url: `/v1/crm/trial/${id}/activate-from-central`,
      headers: { "x-central-trial-webhook-key": "anything" },
      payload: { centralLicenseRef: "lic-test-12345678" },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json().code).toBe("CENTRAL_TRIAL_WEBHOOK_NOT_CONFIGURED");
  });

  it("validates unsafe image uploads/urls", () => {
    expect(validateImageUploadMeta({ filename: "../../etc/passwd", contentType: "image/png" }).ok).toBe(false);
    expect(validateImageUploadMeta({ filename: "x.exe", contentType: "application/octet-stream" }).ok).toBe(false);
    expect(validateImageUploadMeta({ filename: "ok.png", contentType: "image/png", sizeBytes: 100 }).ok).toBe(true);
    expect(validatePublicImageUrl("javascript:alert(1)").ok).toBe(false);
    expect(validatePublicImageUrl("https://cdn.example.com/images/pos.png").ok).toBe(true);
  });
});
