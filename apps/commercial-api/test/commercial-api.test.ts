import "reflect-metadata";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

process.env.NODE_ENV = "test";
process.env.PORT = "3110";
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

describe("commercial-api critical paths", () => {
  let app: import("@nestjs/platform-fastify").NestFastifyApplication;
  let prisma: import("@camacho-pos-comercial/database").PrismaClient;

  beforeAll(async () => {
    const { NestFactory } = await import("@nestjs/core");
    const { FastifyAdapter } = await import("@nestjs/platform-fastify");
    const { PrismaClient } = await import("@camacho-pos-comercial/database");
    const { AppModule } = await import("../src/app.module.js");

    prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    await prisma.$connect();

    app = await NestFactory.create(
      AppModule,
      new FastifyAdapter({ logger: false }),
      { logger: false },
    );
    app.setGlobalPrefix("v1", { exclude: ["health"] });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  async function inject(
    method: "GET" | "POST" | "PATCH",
    url: string,
    opts?: { payload?: unknown; headers?: Record<string, string> },
  ) {
    const server = app.getHttpAdapter().getInstance();
    return server.inject({
      method,
      url,
      payload: opts?.payload as object | undefined,
      headers: opts?.headers,
    });
  }

  function errorCode(body: unknown): string {
    if (!body || typeof body !== "object") return String(body);
    const record = body as Record<string, unknown>;
    if (typeof record.code === "string") return record.code;
    if (record.message && typeof record.message === "object") {
      const msg = record.message as Record<string, unknown>;
      if (typeof msg.code === "string") return msg.code;
    }
    if (typeof record.message === "string") return record.message;
    return JSON.stringify(body);
  }

  it("rejects expired coupons", async () => {
    const res = await inject("GET", "/v1/promotions/coupons/EXPIRED10/validate");
    expect(res.statusCode).toBe(400);
    expect(errorCode(res.json())).toBe("COUPON_EXPIRED");
  });

  it("rejects draft prices as not purchasable", async () => {
    const draftPrice = await prisma.planPrice.findFirst({
      where: { publicationStatus: "DRAFT" },
    });
    expect(draftPrice).toBeTruthy();

    const cartRes = await inject("POST", "/v1/cart");
    expect([200, 201]).toContain(cartRes.statusCode);
    const cart = cartRes.json();

    const addRes = await inject("POST", `/v1/cart/${cart.sessionToken}/items`, {
      payload: {
        planPriceId: draftPrice!.id,
        quantity: 1,
        expectedPriceVersion: draftPrice!.version,
      },
    });
    expect(addRes.statusCode).toBe(400);
    expect(errorCode(addRes.json())).toBe("DRAFT_PRICE_NOT_PURCHASABLE");
  });

  it("rejects price tampering on published prices", async () => {
    const plan = await prisma.plan.findFirstOrThrow({ where: { slug: "esencial" } });
    const price = await prisma.planPrice.findFirstOrThrow({
      where: { planId: plan.id, billingInterval: "MONTHLY" },
    });

    await prisma.plan.update({
      where: { id: plan.id },
      data: { publicationStatus: "PUBLISHED" },
    });
    await prisma.planPrice.update({
      where: { id: price.id },
      data: { publicationStatus: "PUBLISHED" },
    });

    try {
      const cartRes = await inject("POST", "/v1/cart");
      const cart = cartRes.json();

      const tampered = await inject("POST", `/v1/cart/${cart.sessionToken}/items`, {
        payload: {
          planPriceId: price.id,
          quantity: 1,
          expectedPriceVersion: price.version,
          expectedUnitAmountCents: price.amountCents + 1,
        },
      });
      expect(tampered.statusCode).toBe(400);
      expect(errorCode(tampered.json())).toBe("PRICE_TAMPERING_REJECTED");
    } finally {
      await prisma.planPrice.update({
        where: { id: price.id },
        data: { publicationStatus: "DRAFT" },
      });
      await prisma.plan.update({
        where: { id: plan.id },
        data: { publicationStatus: "DRAFT" },
      });
    }
  });

  it("webhook is idempotent on duplicate delivery", async () => {
    const customer = await prisma.commercialCustomer.upsert({
      where: { email: "webhook-test@example.com" },
      create: {
        email: "webhook-test@example.com",
        fullName: "Webhook Test",
      },
      update: {},
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-WH-${Date.now()}`,
        customerId: customer.id,
        status: "PENDING_PAYMENT",
        subtotalCents: 49900,
        totalCents: 49900,
        idempotencyKey: `idem-wh-${Date.now()}`,
      },
    });
    const referenceCode = `CPC-PAY-TEST-${Date.now()}`;
    await prisma.payment.create({
      data: {
        orderId: order.id,
        customerId: customer.id,
        provider: "SANDBOX_MOCK",
        environment: "SANDBOX",
        status: "PENDING",
        amountCents: 49900,
        referenceCode,
      },
    });

    const key = process.env.FACTUS_PAY_SANDBOX_WEBHOOK_KEY!;
    const payload = {
      data: {
        reference_code: referenceCode,
        amount: 49900,
        status: "paid",
      },
    };

    const first = await inject("POST", `/v1/webhooks/factus-pay/collections?key=${key}`, {
      payload,
    });
    expect([200, 201]).toContain(first.statusCode);
    expect(first.json().result).toBe("STORED");

    const second = await inject("POST", `/v1/webhooks/factus-pay/collections?key=${key}`, {
      payload,
    });
    expect([200, 201]).toContain(second.statusCode);
    expect(second.json().result).toBe("DUPLICATE");

    const payment = await prisma.payment.findUniqueOrThrow({ where: { referenceCode } });
    expect(payment.status).toBe("PAID");
  });

  it("unauthorized admin fails closed without Central credentials", async () => {
    const res = await inject("GET", "/v1/admin/catalog/plans");
    expect(res.statusCode).toBe(401);
    expect(errorCode(res.json())).toBe("PENDING_CENTRAL_CREDENTIALS");
  });

  it("admin test fixture remains disabled by default (fail-closed)", async () => {
    const res = await inject("GET", "/v1/admin/catalog/plans", {
      headers: { "x-admin-test-fixture": "GLOBAL_SUPERADMIN" },
    });
    expect(res.statusCode).toBe(401);
    expect(errorCode(res.json())).toBe("PENDING_CENTRAL_CREDENTIALS");
  });

  it("lists active promotions filtered by time window", async () => {
    const res = await inject("GET", "/v1/promotions");
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ code: string; active: boolean }>;
    expect(Array.isArray(body)).toBe(true);
    // FUTURE-SAMPLE is scheduled ahead and must not appear as active-now
    expect(body.some((p) => p.code === "FUTURE-SAMPLE")).toBe(false);
    // At least one staging campaign with a current Bogota window should be present after seed
    if (body.length) {
      expect(body.every((p) => p.active === true)).toBe(true);
    }
  });

  it("health check works", async () => {
    const res = await inject("GET", "/health");
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
  });
});
