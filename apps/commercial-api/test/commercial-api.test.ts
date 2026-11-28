import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

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

  it("versions an editable price proposal while preserving the published price and its historical amount", async () => {
    const { CatalogService } = await import("../src/modules/catalog/catalog.service.js");
    const catalog = app.get(CatalogService);
    const plan = await prisma.plan.create({
      data: { slug: `ci-price-${randomUUID()}`, name: "CI price versioning", description: "Fixture", publicationStatus: "PUBLISHED" },
    });
    const initial = await prisma.planPrice.create({
      data: { planId: plan.id, version: 1, billingInterval: "MONTHLY", amountCents: 49900, publicationStatus: "PUBLISHED" },
    });

    const draft = await catalog.updatePlanPriceAmount({ planPriceId: initial.id, amountCents: 29900, adminId: "ci-admin" });
    expect(draft).toMatchObject({ version: 2, publicationStatus: "DRAFT", amountCents: 29900 });
    expect(await catalog.getPurchasablePlanPrice(initial.id)).toMatchObject({ version: 1, amountCents: 49900 });
    await expect(catalog.getPurchasablePlanPrice(draft.id)).rejects.toBeDefined();

    const published = await catalog.updatePlanPriceAmount({ planPriceId: draft.id, amountCents: 29900, adminId: "ci-admin", publish: true });
    expect(published).toMatchObject({ version: 3, publicationStatus: "PUBLISHED", amountCents: 29900 });
    expect(await prisma.planPrice.findUniqueOrThrow({ where: { id: initial.id } }))
      .toMatchObject({ version: 1, amountCents: 49900, publicationStatus: "ARCHIVED" });
    expect(await prisma.planPriceHistory.count({ where: { planPriceId: { in: [draft.id, published.id] } } })).toBe(2);
  });

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

    // Confirmed payment is retained while the Global operator binds the order.
    const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paidOrder.status).toBe("PAID");
    const provision = await prisma.provisioningRequest.findFirst({ where: { orderId: order.id } });
    expect(provision?.status).toBe("PENDING");
    expect(provision?.lastError).toBe("PROVISION_BINDING_REQUIRED");
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

  it("keeps one checkout and one business profile on concurrent HTTP retries", async () => {
    const key = randomUUID();
    const plan = await prisma.plan.create({
      data: { slug: key, name: "Plan de prueba", description: "Plan de prueba", publicationStatus: "PUBLISHED" },
    });
    const price = await prisma.planPrice.create({
      data: { planId: plan.id, billingInterval: "MONTHLY", version: 1, amountCents: 49900, publicationStatus: "PUBLISHED" },
    });
    const cart = (await inject("POST", "/v1/cart")).json();
    const selection = await inject("POST", `/v1/cart/${cart.sessionToken}/items`, {
      payload: { planPriceId: price.id, quantity: 1, expectedPriceVersion: 1 },
    });
    expect(selection.statusCode).toBe(201);
    const { PaymentsService } = await import("../src/modules/payments/payments.service.js");
    const collection = vi.spyOn(app.get(PaymentsService), "createCollectionForOrder")
      .mockImplementation(input => prisma.payment.create({
        data: { ...input, provider: "SANDBOX_MOCK", environment: "SANDBOX", referenceCode: key },
      }));
    const body = {
      cartSessionToken: cart.sessionToken, idempotencyKey: key,
      customer: { email: `${key}@example.test`, fullName: "Cliente fixture" },
      business: { legalName: "Empresa fixture", cajaCount: 1 },
    };
    try {
      const outcomes = await Promise.all([
        inject("POST", "/v1/checkout", { payload: body }),
        inject("POST", "/v1/checkout", { payload: body }),
      ]);
      expect(outcomes.map(response => response.statusCode)).toEqual([201, 201]);
      expect(outcomes[0]!.json().id).toBe(outcomes[1]!.json().id);
      expect(collection).toHaveBeenCalledTimes(1);
      const stored = await prisma.order.findUniqueOrThrow({ where: { idempotencyKey: key } });
      expect(await prisma.businessProfile.count({ where: { customerId: stored.customerId } })).toBe(1);

      const otherCart = (await inject("POST", "/v1/cart")).json();
      const denied = await inject("POST", "/v1/checkout", {
        payload: { ...body, cartSessionToken: otherCart.sessionToken },
      });
      expect(denied.statusCode).toBe(409);
      expect(errorCode(denied.json())).toBe("CHECKOUT_KEY_CONFLICT");
    } finally {
      collection.mockRestore();
    }
  });

  it.each([true, false])("records hardware delivery with software present: %s", async requiresActivation => {
    const idempotencyKey = randomUUID();
    const customer = await prisma.commercialCustomer.create({
      data: { email: `${idempotencyKey}@example.test`, fullName: "Entrega fixture" },
    });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id, orderNumber: idempotencyKey, idempotencyKey,
        status: "PROVISIONING", subtotalCents: 100, totalCents: 100,
        items: { create: { label: "Pedido de prueba", quantity: 1, unitAmountCents: 100, lineTotalCents: 100, priceVersion: 1,
          ...(requiresActivation ? { planPriceId: publishablePriceId } : {}) } },
        shipments: { create: { status: "SHIPPED", amountCents: 0, shippedAt: new Date() } },
      },
    });
    const { AppConfigService } = await import("../src/config/config.service.js");
    const config = app.get(AppConfigService);
    const previous = config.env.ALLOW_ADMIN_TEST_FIXTURE;
    config.env.ALLOW_ADMIN_TEST_FIXTURE = true;
    try {
      const response = await inject("PATCH", `/v1/admin/pedidos/${order.id}`, {
        payload: { action: "DELIVER" },
        headers: { "x-admin-test-fixture": "GLOBAL_SUPERADMIN" },
      });
      const expectedStatus = requiresActivation ? "PROVISIONING" : "FULFILLED";
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ order: { status: expectedStatus }, shipment: { status: "DELIVERED" } });
      const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { shipments: true } });
      expect(stored.status).toBe(expectedStatus);
      expect(stored.shipments).toMatchObject([{ status: "DELIVERED", deliveredAt: expect.any(Date) }]);
    } finally {
      config.env.ALLOW_ADMIN_TEST_FIXTURE = previous;
    }
  });

  it("binds paid orders through GLOBAL and freezes the Central UUID payload in PostgreSQL", async () => {
    const unique = randomUUID();
    const customer = await prisma.commercialCustomer.create({
      data: { email: `${unique}@example.test`, fullName: "Compra fixture" },
    });
    const plan = await prisma.plan.create({
      data: { slug: unique, name: "Plan fixture", description: "Plan de contrato" },
    });
    const price = await prisma.planPrice.create({
      data: { planId: plan.id, version: 1, billingInterval: "PERPETUAL", amountCents: 49900 },
    });
    const profile = await prisma.businessProfile.create({
      data: { customerId: customer.id, legalName: "Empresa fixture" },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: unique, idempotencyKey: unique, customerId: customer.id,
        businessProfileId: profile.id, status: "PENDING_PAYMENT", subtotalCents: 49900, totalCents: 49900,
        items: { create: { planId: plan.id, planPriceId: price.id, priceVersion: 1, quantity: 1,
          label: "Plan fixture", unitAmountCents: 49900, lineTotalCents: 49900 } },
      },
    });
    const referenceCode = `CPC-PAY-${unique}`;
    await prisma.payment.create({
      data: { orderId: order.id, customerId: customer.id, status: "PENDING", environment: "SANDBOX",
        provider: "FACTUS_PAY", amountCents: 49900, referenceCode },
    });
    const path = `/v1/provisioning/orders/${order.id}/binding`;
    const paymentPath = `/v1/payments/${referenceCode}`;
    expect((await inject("GET", paymentPath)).json()).toMatchObject({
      status: "PENDING", commercialStatus: null,
    });
    const payload: { centralTenantId: string; centralPlanId: string } = { centralTenantId: randomUUID(), centralPlanId: randomUUID() };
    const { AppConfigService } = await import("../src/config/config.service.js");
    const config = app.get(AppConfigService);
    const bindAsGlobal = async (body: typeof payload) => {
      const previous = config.env.ALLOW_ADMIN_TEST_FIXTURE;
      config.env.ALLOW_ADMIN_TEST_FIXTURE = true;
      try {
        return await inject("POST", path, { payload: body, headers: { "x-admin-test-fixture": "GLOBAL_SUPERADMIN" } });
      } finally {
        config.env.ALLOW_ADMIN_TEST_FIXTURE = previous;
      }
    };
    const denied = await inject("POST", path, { payload });
    expect([401, 403]).toContain(denied.statusCode);
    expect((await bindAsGlobal(payload)).statusCode).toBe(404);

    const webhook = await inject("POST", "/v1/webhooks/factus-pay/collections", {
      payload: { data: { reference_code: referenceCode, amount: 49900, status: "paid" } },
      headers: { "x-factus-pay-webhook-key": process.env.FACTUS_PAY_SANDBOX_WEBHOOK_KEY! },
    });
    expect(webhook.json().result).toBe("STORED");
    expect((await inject("GET", paymentPath)).json()).toMatchObject({
      status: "PAID", commercialStatus: "WAITING_BINDING",
    });

    const incorrect = await bindAsGlobal({ ...payload, centralPlanId: plan.id });
    expect(incorrect.statusCode).toBe(400);
    for (let retry = 0; retry < 2; retry += 1) {
      const result = await bindAsGlobal(payload);
      expect(result.statusCode).toBe(201);
      expect(result.json()).toMatchObject({ status: "QUEUED" });
    }
    const conflicting = await bindAsGlobal({ ...payload, centralTenantId: randomUUID() });
    expect(conflicting.statusCode).toBe(409);

    expect(await prisma.planPrice.findUnique({ where: { id: price.id } })).toMatchObject({ centralPlanId: payload.centralPlanId });
    expect(await prisma.businessProfile.findUnique({ where: { id: profile.id } })).toMatchObject({ centralTenantId: payload.centralTenantId });
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: "PROVISIONING" });
    const requests = await prisma.provisioningRequest.findMany({ where: { orderId: order.id } });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      payload: { planId: payload.centralPlanId, tenantId: payload.centralTenantId, licenseUnits: 1,
        items: [{ planId: payload.centralPlanId, priceVersion: 1 }] },
    });
    expect(await prisma.auditLog.count({ where: { entityId: requests[0]!.id, action: "PROVISIONING_BINDING_PREPARED" } })).toBe(1);
    const queued = (await inject("GET", paymentPath)).json();
    expect(queued).toMatchObject({ commercialStatus: "QUEUED" });
    expect(queued).not.toHaveProperty("order");
    expect(JSON.stringify(queued)).not.toContain(payload.centralTenantId);
    expect(JSON.stringify(queued)).not.toContain(payload.centralPlanId);

    const requestId = requests[0]!.id;
    const workerPath = "/v1/provisioning/worker/run";
    expect([401, 403]).toContain((await inject("POST", workerPath)).statusCode);

    // Seed an abandoned lease using the same columns as the running worker.
    await prisma.provisioningRequest.update({
      where: { id: requestId },
      data: { attemptCount: 1, nextRetryAt: new Date(Date.now() + 60_000) },
    });
    const issuedLicenseId = randomUUID();
    let centralCalls = 0;
    const server = createServer((request, response) => {
      request.resume();
      request.on("end", () => {
        centralCalls += 1;
        // Give the overlapping workers time to try claiming the same row.
        setTimeout(() => {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({
            status: "DUPLICATE", provisioningId: "test-provision-id",
            idempotencyKey: request.headers["idempotency-key"], licenseUnits: 1,
            cajaRule: "ONE_LICENSE_ONE_CAJA", fulfillment: "ALREADY_ISSUED",
            licenseIds: [issuedLicenseId],
          }));
        }, 80);
      });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test Central address missing");
    const origin = vi.spyOn(config, "centralOrigin").mockReturnValue(`http://127.0.0.1:${address.port}`);
    const previous = config.env.ALLOW_ADMIN_TEST_FIXTURE;
    const previousKey = config.env.COMMERCIAL_BRIDGE_KEY;
    config.env.ALLOW_ADMIN_TEST_FIXTURE = true;
    config.env.COMMERCIAL_BRIDGE_KEY = randomUUID().replaceAll("-", "");
    const { ProvisioningScheduler } = await import("../src/modules/provisioning/provisioning-scheduler.js");
    const scheduler = app.get(ProvisioningScheduler);
    const previousScheduler = config.env.COMMERCIAL_PROVISIONING_WORKER_ENABLED;
    const worker = () => inject("POST", workerPath, { headers: { "x-admin-test-fixture": "GLOBAL_SUPERADMIN" } });
    try {
      const deferred = await worker();
      expect(deferred.statusCode).toBe(201);
      expect(deferred.json()).toEqual([]);
      expect(centralCalls).toBe(0);
      await prisma.provisioningRequest.update({
        where: { id: requestId }, data: { nextRetryAt: new Date(Date.now() - 1_000) },
      });
      const attempts = await Promise.all([worker(), worker(), worker(), worker()]);
      expect(attempts.map(result => result.statusCode)).toEqual([201, 201, 201, 201]);
      expect(attempts.flatMap(result => result.json()).filter((result: { status: string }) => result.status === "SENT"))
        .toEqual([expect.objectContaining({ id: requestId, licenseIds: [issuedLicenseId] })]);
      expect(centralCalls).toBe(1);
      expect(await prisma.provisioningRequest.findUnique({ where: { id: requestId } })).toMatchObject({
        status: "SENT", attemptCount: 2, nextRetryAt: null,
        payload: { centralLicenseIds: [issuedLicenseId] },
      });

      const automatic = await buyAgain(1);
      expect(automatic.state).toMatchObject({ commercialStatus: "QUEUED" });
      config.env.COMMERCIAL_PROVISIONING_WORKER_ENABLED = true;
      scheduler.onApplicationBootstrap();
      await vi.waitFor(async () => {
        expect(await prisma.provisioningRequest.findUniqueOrThrow({ where: { id: automatic.request.id } }))
          .toMatchObject({ status: "SENT", attemptCount: 1 });
      }, { timeout: 5_000, interval: 50 });
      expect(centralCalls).toBe(2);
      expect(await prisma.order.findUniqueOrThrow({ where: { id: automatic.request.orderId } }))
        .toMatchObject({ status: "PROVISIONING" });
    } finally {
      await scheduler.onModuleDestroy();
      config.env.COMMERCIAL_PROVISIONING_WORKER_ENABLED = previousScheduler;
      config.env.ALLOW_ADMIN_TEST_FIXTURE = previous;
      config.env.COMMERCIAL_BRIDGE_KEY = previousKey;
      origin.mockRestore();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
    expect((await inject("GET", paymentPath)).json()).toMatchObject({
      commercialStatus: "PENDING_ACTIVATION",
    });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROVISIONING");

    async function buyAgain(version: number) {
      const orderNumber = `CPC-${randomUUID()}`;
      const nextOrder = await prisma.order.create({
        data: {
          orderNumber, idempotencyKey: orderNumber, customerId: customer.id, businessProfileId: profile.id,
          status: "PENDING_PAYMENT", subtotalCents: 49900, totalCents: 49900,
          items: { create: { planId: plan.id, planPriceId: price.id, priceVersion: version,
            quantity: 1, label: "Plan fixture", unitAmountCents: 49900, lineTotalCents: 49900 } },
        },
      });
      const nextReference = `CPC-PAY-${orderNumber}`;
      await prisma.payment.create({
        data: { orderId: nextOrder.id, customerId: customer.id, status: "PENDING", environment: "SANDBOX",
          provider: "FACTUS_PAY", amountCents: 49900, referenceCode: nextReference },
      });
      const send = () => inject("POST", "/v1/webhooks/factus-pay/collections", {
        payload: { data: { reference_code: nextReference, amount: 49900, status: "paid" } },
        headers: { "x-factus-pay-webhook-key": process.env.FACTUS_PAY_SANDBOX_WEBHOOK_KEY! },
      });
      expect((await send()).json().result).toBe("STORED");
      expect((await send()).json().result).toBe("DUPLICATE");
      const requestsForOrder = await prisma.provisioningRequest.findMany({ where: { orderId: nextOrder.id } });
      expect(requestsForOrder).toHaveLength(1);
      return {
        request: requestsForOrder[0]!,
        state: (await inject("GET", `/v1/payments/${nextReference}`)).json(),
      };
    }

    const mapped = await buyAgain(1);
    expect(mapped.request).toMatchObject({ status: "QUEUED", attemptCount: 0, wirePreparedAt: expect.any(Date),
      payload: { tenantId: payload.centralTenantId, planId: payload.centralPlanId } });
    expect(mapped.state).toMatchObject({ commercialStatus: "QUEUED" });
    expect(await prisma.auditLog.count({ where: { entityId: mapped.request.id, action: "PROVISIONING_BINDING_REUSED" } })).toBe(1);

    const unmapped = await buyAgain(2);
    expect(unmapped.request).toMatchObject({ status: "PENDING", wirePreparedAt: null });
    expect(unmapped.state).toMatchObject({ commercialStatus: "WAITING_BINDING" });
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
