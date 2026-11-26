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
  let draftPriceId: string;
  let draftPriceVersion: number;
  let publishablePlanId: string;
  let publishablePriceId: string;
  let publishablePriceVersion: number;
  let publishableAmountCents: number;

  beforeAll(async () => {
    const { NestFactory } = await import("@nestjs/core");
    const { FastifyAdapter } = await import("@nestjs/platform-fastify");
    const { PrismaClient } = await import("@camacho-pos-comercial/database");
    const { AppModule } = await import("../src/app.module.js");

    prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    await prisma.$connect();

    // Self-contained fixtures — CI migrates but does not seed catalog data.
    const draftPlan = await prisma.plan.upsert({
      where: { slug: "ci-draft-plan" },
      create: {
        slug: "ci-draft-plan",
        name: "CI Draft Plan",
        description: "Fixture for DRAFT purchase rejection",
        publicationStatus: "DRAFT",
        sortOrder: 900,
      },
      update: { publicationStatus: "DRAFT", deletedAt: null },
    });
    const draftPrice = await prisma.planPrice.upsert({
      where: {
        planId_billingInterval_version: {
          planId: draftPlan.id,
          billingInterval: "MONTHLY",
          version: 1,
        },
      },
      create: {
        planId: draftPlan.id,
        billingInterval: "MONTHLY",
        version: 1,
        amountCents: 49900,
        publicationStatus: "DRAFT",
      },
      update: { amountCents: 49900, publicationStatus: "DRAFT" },
    });
    draftPriceId = draftPrice.id;
    draftPriceVersion = draftPrice.version;

    const publishablePlan = await prisma.plan.upsert({
      where: { slug: "ci-publishable-plan" },
      create: {
        slug: "ci-publishable-plan",
        name: "CI Publishable Plan",
        description: "Fixture for price-tampering checks",
        publicationStatus: "DRAFT",
        sortOrder: 901,
      },
      update: { deletedAt: null },
    });
    const publishablePrice = await prisma.planPrice.upsert({
      where: {
        planId_billingInterval_version: {
          planId: publishablePlan.id,
          billingInterval: "MONTHLY",
          version: 1,
        },
      },
      create: {
        planId: publishablePlan.id,
        billingInterval: "MONTHLY",
        version: 1,
        amountCents: 79900,
        publicationStatus: "DRAFT",
      },
      update: { amountCents: 79900 },
    });
    publishablePlanId = publishablePlan.id;
    publishablePriceId = publishablePrice.id;
    publishablePriceVersion = publishablePrice.version;
    publishableAmountCents = publishablePrice.amountCents;

    const expiredEnds = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.coupon.upsert({
      where: { code: "EXPIRED10" },
      create: {
        code: "EXPIRED10",
        type: "PERCENT",
        percentOff: 10,
        active: true,
        endsAt: expiredEnds,
      },
      update: {
        type: "PERCENT",
        percentOff: 10,
        active: true,
        endsAt: expiredEnds,
        deletedAt: null,
      },
    });

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
    const cartRes = await inject("POST", "/v1/cart");
    expect([200, 201]).toContain(cartRes.statusCode);
    const cart = cartRes.json();

    const addRes = await inject("POST", `/v1/cart/${cart.sessionToken}/items`, {
      payload: {
        planPriceId: draftPriceId,
        quantity: 1,
        expectedPriceVersion: draftPriceVersion,
      },
    });
    expect(addRes.statusCode).toBe(400);
    expect(errorCode(addRes.json())).toBe("DRAFT_PRICE_NOT_PURCHASABLE");
  });

  it("rejects price tampering on published prices", async () => {
    await prisma.plan.update({
      where: { id: publishablePlanId },
      data: { publicationStatus: "PUBLISHED" },
    });
    await prisma.planPrice.update({
      where: { id: publishablePriceId },
      data: { publicationStatus: "PUBLISHED" },
    });

    try {
      const cartRes = await inject("POST", "/v1/cart");
      const cart = cartRes.json();

      const tampered = await inject("POST", `/v1/cart/${cart.sessionToken}/items`, {
        payload: {
          planPriceId: publishablePriceId,
          quantity: 1,
          expectedPriceVersion: publishablePriceVersion,
          expectedUnitAmountCents: publishableAmountCents + 1,
        },
      });
      expect(tampered.statusCode).toBe(400);
      expect(errorCode(tampered.json())).toBe("PRICE_TAMPERING_REJECTED");
    } finally {
      await prisma.planPrice.update({
        where: { id: publishablePriceId },
        data: { publicationStatus: "DRAFT" },
      });
      await prisma.plan.update({
        where: { id: publishablePlanId },
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

    const refused = await inject("POST", "/v1/webhooks/factus-pay/collections", {
      payload,
      headers: { authorization: `Bearer ${key}` },
    });
    expect(refused.statusCode).toBe(400);
    expect(errorCode(refused.json())).toBe("FACTUS_PAY_SOURCE_MISMATCH");
    expect(await prisma.provisioningRequest.count({ where: { orderId: order.id } })).toBe(0);

    await prisma.payment.update({ where: { referenceCode }, data: { provider: "FACTUS_PAY" } });
    const responses = await Promise.all([
      inject("POST", "/v1/webhooks/factus-pay/collections", {
        payload,
        headers: { authorization: `Bearer ${key}` },
      }),
      inject("POST", "/v1/webhooks/factus-pay/collections", {
        payload,
        headers: { "x-factus-pay-webhook-key": key },
      }),
    ]);
    expect(responses.map((response) => response.statusCode).every((code) => [200, 201].includes(code))).toBe(true);
    expect(responses.map((response) => response.json().result).sort()).toEqual(["DUPLICATE", "STORED"]);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { referenceCode } });
    expect(payment.status).toBe("PAID");

    // Central origin empty → order stays PAID, provisioning PENDING (PAID+PENDING_PROVISION)
    const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paidOrder.status).toBe("PAID");
    const provision = await prisma.provisioningRequest.findFirst({ where: { orderId: order.id } });
    expect(provision?.status).toBe("PENDING");
    expect(provision?.lastError).toBe("PENDING_CENTRAL_CREDENTIALS");
    expect(await prisma.paymentAttempt.count({ where: { paymentId: payment.id, status: "SUCCEEDED" } })).toBe(1);
    expect(await prisma.provisioningRequest.count({ where: { orderId: order.id } })).toBe(1);

    // Reproduce a historical PAID order where the portal stopped before creating the outbox row.
    await prisma.provisioningRequest.deleteMany({ where: { orderId: order.id } });
    const replay = await inject("POST", "/v1/webhooks/factus-pay/collections", {
      payload,
      headers: { authorization: `Bearer ${key}` },
    });
    expect(replay.json().result).toBe("DUPLICATE");
    expect(await prisma.provisioningRequest.count({ where: { orderId: order.id } })).toBe(1);

  });

  it("sandbox simulate paid does not call Central provision", async () => {
    const originalFetch = globalThis.fetch;
    let centralFetches = 0;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/v1/commercial/provisioning") || url.includes("central")) {
        centralFetches += 1;
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const customer = await prisma.commercialCustomer.upsert({
        where: { email: "simulate-test@example.com" },
        create: {
          email: "simulate-test@example.com",
          fullName: "Simulate Test",
        },
        update: {},
      });
      const order = await prisma.order.create({
        data: {
          orderNumber: `TEST-SIM-${Date.now()}`,
          customerId: customer.id,
          status: "PENDING_PAYMENT",
          subtotalCents: 39900,
          totalCents: 39900,
          idempotencyKey: `idem-sim-${Date.now()}`,
        },
      });
      const referenceCode = `CPC-PAY-SIM-${Date.now()}`;
      await prisma.payment.create({
        data: {
          orderId: order.id,
          customerId: customer.id,
          provider: "SANDBOX_MOCK",
          environment: "SANDBOX",
          status: "PENDING",
          amountCents: 39900,
          referenceCode,
        },
      });

      // Even if Central origin were set mid-test, simulate must not provision.
      process.env.CENTRAL_AUTHORITY_ORIGIN = "https://central.example.test";

      const res = await inject("POST", `/v1/payments/${referenceCode}/sandbox-simulate-paid`);
      expect([200, 201]).toContain(res.statusCode);
      const body = res.json() as { result: string; provisionedToCentral?: boolean };
      expect(body.result).toBe("STORED");
      expect(body.provisionedToCentral).toBe(false);

      const payment = await prisma.payment.findUniqueOrThrow({ where: { referenceCode } });
      expect(payment.status).toBe("PAID");
      const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(paidOrder.status).toBe("PAID");

      const provision = await prisma.provisioningRequest.findFirst({ where: { orderId: order.id } });
      expect(provision).toBeNull();
      expect(centralFetches).toBe(0);

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "SANDBOX_SIMULATE_PAID_NO_CENTRAL_PROVISION",
          entityId: payment.id,
        },
      });
      expect(audit).toBeTruthy();
    } finally {
      globalThis.fetch = originalFetch;
      process.env.CENTRAL_AUTHORITY_ORIGIN = "";
    }
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
    const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const futureEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await prisma.promotion.upsert({
      where: { code: "FUTURE-SAMPLE" },
      create: {
        code: "FUTURE-SAMPLE",
        name: "Future sample",
        publicationStatus: "PUBLISHED",
        startsAt: futureStart,
        endsAt: futureEnd,
      },
      update: {
        publicationStatus: "PUBLISHED",
        startsAt: futureStart,
        endsAt: futureEnd,
        deletedAt: null,
      },
    });

    const activeStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.promotion.upsert({
      where: { code: "CI-ACTIVE" },
      create: {
        code: "CI-ACTIVE",
        name: "CI active promo",
        publicationStatus: "PUBLISHED",
        startsAt: activeStart,
        endsAt: activeEnd,
      },
      update: {
        publicationStatus: "PUBLISHED",
        startsAt: activeStart,
        endsAt: activeEnd,
        deletedAt: null,
      },
    });

    const res = await inject("GET", "/v1/promotions");
    expect(res.statusCode).toBe(200);
    const body = res.json() as Array<{ code: string; active: boolean }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((p) => p.code === "FUTURE-SAMPLE")).toBe(false);
    expect(body.some((p) => p.code === "CI-ACTIVE")).toBe(true);
    expect(body.every((p) => p.active === true)).toBe(true);
  });

  it("health check works", async () => {
    const res = await inject("GET", "/health");
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
  });
});
