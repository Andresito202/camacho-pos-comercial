import "reflect-metadata";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

process.env.NODE_ENV = "test";
process.env.PORT = "3112";
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
process.env.ALLOW_ADMIN_TEST_FIXTURE = "1";

const FIXTURE_HEADERS = { "x-admin-test-fixture": "GLOBAL_SUPERADMIN" };

describe("admin test fixture (non-production only)", () => {
  let app: import("@nestjs/platform-fastify").NestFastifyApplication;
  let prisma: import("@camacho-pos-comercial/database").PrismaClient;
  let planPriceId: string;
  let originalAmountCents: number;

  beforeAll(async () => {
    const { NestFactory } = await import("@nestjs/core");
    const { FastifyAdapter } = await import("@nestjs/platform-fastify");
    const { PrismaClient } = await import("@camacho-pos-comercial/database");
    const { AppModule } = await import("../src/app.module.js");

    prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    await prisma.$connect();

    const plan = await prisma.plan.upsert({
      where: { slug: "ci-admin-fixture-plan" },
      create: {
        slug: "ci-admin-fixture-plan",
        name: "CI Admin Fixture Plan",
        description: "Fixture for admin PATCH price restore",
        publicationStatus: "DRAFT",
        sortOrder: 910,
      },
      update: { deletedAt: null },
    });
    // updatePlanPriceAmount bumps version in-place; wipe prior versions so
    // re-runs never collide on (planId, billingInterval, version).
    await prisma.planPriceHistory.deleteMany({ where: { planPrice: { planId: plan.id } } });
    await prisma.planPrice.deleteMany({ where: { planId: plan.id } });
    const price = await prisma.planPrice.create({
      data: {
        planId: plan.id,
        billingInterval: "MONTHLY",
        version: 1,
        amountCents: 55500,
        publicationStatus: "DRAFT",
      },
    });
    planPriceId = price.id;
    originalAmountCents = price.amountCents;

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

  it("rejects unauthorized admin with 401", async () => {
    const server = app.getHttpAdapter().getInstance();
    const res = await server.inject({
      method: "GET",
      url: "/v1/admin/catalog/plans",
    });
    expect(res.statusCode).toBe(401);
  });

  it("accepts X-Admin-Test-Fixture when ALLOW_ADMIN_TEST_FIXTURE=1", async () => {
    const server = app.getHttpAdapter().getInstance();
    const res = await server.inject({
      method: "GET",
      url: "/v1/admin/catalog/plans",
      headers: FIXTURE_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("with fixture can PATCH a plan price then restore", async () => {
    const server = app.getHttpAdapter().getInstance();
    const patchedAmount = originalAmountCents + 100;

    const patch = await server.inject({
      method: "PATCH",
      url: `/v1/admin/catalog/plan-prices/${planPriceId}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { amountCents: patchedAmount, publish: false },
    });
    expect(patch.statusCode).toBe(200);
    const patchedBody = patch.json() as { amountCents: number; id: string };
    expect(patchedBody.amountCents).toBe(patchedAmount);

    expect(patchedBody.id).not.toBe(planPriceId);
    const stale = await server.inject({
      method: "PATCH",
      url: `/v1/admin/catalog/plan-prices/${planPriceId}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { amountCents: originalAmountCents, publish: false },
    });
    expect(stale.statusCode).toBe(400);

    const restore = await server.inject({
      method: "PATCH",
      url: `/v1/admin/catalog/plan-prices/${patchedBody.id}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { amountCents: originalAmountCents, publish: false },
    });
    expect(restore.statusCode).toBe(200);
    const restoredBody = restore.json() as { amountCents: number };
    expect(restoredBody.amountCents).toBe(originalAmountCents);

    const row = await prisma.planPrice.findUniqueOrThrow({ where: { id: planPriceId } });
    expect(row).toMatchObject({ amountCents: originalAmountCents, publicationStatus: "ARCHIVED" });
  });

  it("promo / coupon outside America/Bogota window is not applied", async () => {
    const server = app.getHttpAdapter().getInstance();
    const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const futureEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await prisma.promotion.upsert({
      where: { code: "ADMIN-FIXTURE-FUTURE" },
      create: {
        code: "ADMIN-FIXTURE-FUTURE",
        name: "Future promo fixture",
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

    await prisma.coupon.upsert({
      where: { code: "ADMIN-FIXTURE-EXPIRED" },
      create: {
        code: "ADMIN-FIXTURE-EXPIRED",
        type: "PERCENT",
        percentOff: 25,
        active: true,
        startsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      update: {
        active: true,
        percentOff: 25,
        deletedAt: null,
        startsAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    });

    const publicList = await server.inject({
      method: "GET",
      url: "/v1/promotions?includeDraft=0",
    });
    expect(publicList.statusCode).toBe(200);
    const promos = publicList.json() as Array<{ code: string }>;
    expect(promos.some((p) => p.code === "ADMIN-FIXTURE-FUTURE")).toBe(false);

    const validate = await server.inject({
      method: "GET",
      url: "/v1/promotions/coupons/ADMIN-FIXTURE-EXPIRED/validate",
    });
    expect(validate.statusCode).toBe(400);
    const body = validate.json() as { code?: string; message?: { code?: string } | string };
    const code =
      typeof body.message === "object" && body.message
        ? body.message.code
        : body.code;
    expect(code).toBe("COUPON_EXPIRED");
  });

  it("CRM lead status patch + activity write to Postgres", async () => {
    const server = app.getHttpAdapter().getInstance();
    const lead = await prisma.lead.create({
      data: {
        email: `ci-admin-lead-${Date.now()}@example.com`,
        fullName: "CI Admin Lead",
        status: "NEW",
        source: "admin-fixture",
      },
    });

    const patch = await server.inject({
      method: "PATCH",
      url: `/v1/admin/clientes/leads/${lead.id}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { status: "CONTACTED", notes: "Llamada inicial CI" },
    });
    expect(patch.statusCode).toBe(200);
    const patched = patch.json() as { status: string; notes: string | null };
    expect(patched.status).toBe("CONTACTED");

    const activity = await server.inject({
      method: "POST",
      url: `/v1/admin/clientes/leads/${lead.id}/activities`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { type: "NOTE", body: "Seguimiento CI" },
    });
    // Nest returns 201 by default for POST; some adapters may surface 200 with the entity.
    expect([200, 201]).toContain(activity.statusCode);

    const row = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(row.status).toBe("CONTACTED");
    const activities = await prisma.leadActivity.findMany({ where: { leadId: lead.id } });
    expect(activities.some((a) => a.type === "STATUS_CHANGE")).toBe(true);
    expect(activities.some((a) => a.body === "Seguimiento CI")).toBe(true);

    await prisma.leadActivity.deleteMany({ where: { leadId: lead.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
  });

  it("creates FAQ and blog drafts via admin content endpoints", async () => {
    const server = app.getHttpAdapter().getInstance();
    const slugSuffix = Date.now();

    const faq = await server.inject({
      method: "POST",
      url: "/v1/admin/contenidos/faqs",
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: {
        slug: `ci-faq-${slugSuffix}`,
        question: "¿Cómo se contrata el plan?",
        answer: "Desde el catálogo comercial con solicitud de contratación.",
        publicationStatus: "DRAFT",
      },
    });
    expect([200, 201]).toContain(faq.statusCode);
    const faqBody = faq.json() as { id: string; slug: string };
    expect(faqBody.slug).toBe(`ci-faq-${slugSuffix}`);

    const blog = await server.inject({
      method: "POST",
      url: "/v1/admin/contenidos/blog",
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: {
        slug: `ci-blog-${slugSuffix}`,
        title: "CI Blog Draft",
        body: "Contenido de prueba del panel comercial.",
        publicationStatus: "DRAFT",
      },
    });
    expect([200, 201]).toContain(blog.statusCode);
    const blogBody = blog.json() as { id: string; title: string };
    expect(blogBody.title).toBe("CI Blog Draft");

    await prisma.faq.delete({ where: { id: faqBody.id } });
    await prisma.blogPost.delete({ where: { id: blogBody.id } });
  });

  it("creates kit with components and reflects PUBLISHED kit on public catalog", async () => {
    const server = app.getHttpAdapter().getInstance();
    const suffix = Date.now();
    const component = await prisma.product.create({
      data: {
        slug: `ci-kit-part-${suffix}`,
        sku: `CI-KIT-PART-${suffix}`,
        name: "CI Kit Part",
        description: "Componente de kit CI",
        kind: "HARDWARE",
        publicationStatus: "PUBLISHED",
        variants: {
          create: {
            sku: `CI-KIT-PART-V-${suffix}`,
            name: "Estándar",
            amountCents: 120000,
            publicationStatus: "PUBLISHED",
            stock: { create: { quantityOnHand: 7, trackInventory: true } },
          },
        },
      },
      include: { variants: true },
    });
    const variantId = component.variants[0]!.id;

    const create = await server.inject({
      method: "POST",
      url: "/v1/admin/catalog/kits",
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: {
        slug: `ci-kit-${suffix}`,
        sku: `CI-KIT-${suffix}`,
        name: "CI Kit Completo",
        description: "Kit de prueba CI",
        amountCents: 450000,
        publicationStatus: "PUBLISHED",
        items: [{ productVariantId: variantId, quantity: 2 }],
      },
    });
    expect([200, 201]).toContain(create.statusCode);
    const kit = create.json() as { id: string; items: Array<{ quantity: number }> };
    expect(kit.items[0]?.quantity).toBe(2);

    const replace = await server.inject({
      method: "PUT",
      url: `/v1/admin/catalog/kits/${kit.id}/items`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { items: [{ productVariantId: variantId, quantity: 3 }] },
    });
    expect(replace.statusCode).toBe(200);
    const replaced = replace.json() as { items: Array<{ quantity: number }> };
    expect(replaced.items[0]?.quantity).toBe(3);

    const publicKits = await server.inject({ method: "GET", url: "/v1/catalog/kits?includeDraft=0" });
    expect(publicKits.statusCode).toBe(200);
    const listed = publicKits.json() as Array<{ id: string; name: string; amountCents: number }>;
    const found = listed.find((row) => row.id === kit.id);
    expect(found?.name).toBe("CI Kit Completo");
    expect(found?.amountCents).toBe(450000);

    await prisma.kitItem.deleteMany({ where: { kitId: kit.id } });
    await prisma.kitPriceHistory.deleteMany({ where: { kitId: kit.id } });
    await prisma.kit.delete({ where: { id: kit.id } });
    await prisma.productStock.deleteMany({ where: { productVariantId: variantId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
    await prisma.product.delete({ where: { id: component.id } });
    const kitProduct = await prisma.product.findFirst({ where: { slug: `ci-kit-${suffix}` } });
    if (kitProduct) {
      await prisma.productImage.deleteMany({ where: { productId: kitProduct.id } });
      await prisma.product.delete({ where: { id: kitProduct.id } });
    }
  });

  it("order ship/deliver/cancel and Factus refund refusal", async () => {
    const server = app.getHttpAdapter().getInstance();
    const suffix = Date.now();
    const customer = await prisma.commercialCustomer.create({
      data: {
        email: `ci-order-${suffix}@example.com`,
        fullName: "CI Order Customer",
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `CI-ORD-${suffix}`,
        customerId: customer.id,
        status: "PAID",
        currencyCode: "COP",
        subtotalCents: 100000,
        shippingCents: 10000,
        totalCents: 110000,
        idempotencyKey: `ci-order-${suffix}`,
        paidAt: new Date(),
        items: {
          create: {
            quantity: 1,
            unitAmountCents: 100000,
            lineTotalCents: 100000,
            priceVersion: 1,
            label: "Terminal CI",
            productId: null,
          },
        },
        payments: {
          create: {
            customerId: customer.id,
            provider: "FACTUS_PAY",
            environment: "SANDBOX",
            status: "PAID",
            amountCents: 110000,
            referenceCode: `ci-ref-${suffix}`,
          },
        },
      },
      include: { items: true },
    });
    // Attach a real product line for hardware shipment path
    const hw = await prisma.product.create({
      data: {
        slug: `ci-hw-ship-${suffix}`,
        sku: `CI-HW-${suffix}`,
        name: "CI HW Ship",
        description: "Hardware para envío CI",
        kind: "HARDWARE",
        publicationStatus: "PUBLISHED",
      },
    });
    await prisma.orderItem.update({
      where: { id: order.items[0]!.id },
      data: { productId: hw.id },
    });

    const ready = await server.inject({
      method: "PATCH",
      url: `/v1/admin/pedidos/${order.id}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { action: "MARK_READY", carrier: "Servientrega" },
    });
    expect(ready.statusCode).toBe(200);

    const ship = await server.inject({
      method: "PATCH",
      url: `/v1/admin/pedidos/${order.id}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { action: "SHIP", carrier: "Servientrega", trackingCode: `TRK-${suffix}` },
    });
    expect(ship.statusCode).toBe(200);

    const deliver = await server.inject({
      method: "PATCH",
      url: `/v1/admin/pedidos/${order.id}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { action: "DELIVER" },
    });
    expect(deliver.statusCode).toBe(200);
    const deliveredOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(deliveredOrder.status).toBe("FULFILLED");

    const factusRefund = await server.inject({
      method: "PATCH",
      url: `/v1/admin/pedidos/${order.id}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { action: "MANUAL_REFUND_MARK", reason: "should fail" },
    });
    expect(factusRefund.statusCode).toBe(400);
    const err = factusRefund.json() as { message?: { code?: string } | string; code?: string };
    const code =
      typeof err.message === "object" && err.message ? err.message.code : err.code;
    expect(code).toBe("FACTUS_REFUND_UNSUPPORTED");

    // Cancel path on a fresh pending order
    const pending = await prisma.order.create({
      data: {
        orderNumber: `CI-CAN-${suffix}`,
        customerId: customer.id,
        status: "PENDING_PAYMENT",
        currencyCode: "COP",
        subtotalCents: 50000,
        totalCents: 50000,
        idempotencyKey: `ci-cancel-${suffix}`,
      },
    });
    const cancel = await server.inject({
      method: "PATCH",
      url: `/v1/admin/pedidos/${pending.id}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { action: "CANCEL", reason: "cliente desistió" },
    });
    expect(cancel.statusCode).toBe(200);
    const cancelled = await prisma.order.findUniqueOrThrow({ where: { id: pending.id } });
    expect(cancelled.status).toBe("CANCELLED");

    await prisma.shipment.deleteMany({ where: { orderId: order.id } });
    await prisma.paymentEvent.deleteMany({ where: { payment: { orderId: order.id } } });
    await prisma.paymentAttempt.deleteMany({ where: { payment: { orderId: order.id } } });
    await prisma.payment.deleteMany({ where: { orderId: order.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: [order.id, pending.id] } } });
    await prisma.order.deleteMany({ where: { id: { in: [order.id, pending.id] } } });
    await prisma.product.delete({ where: { id: hw.id } });
    await prisma.commercialCustomer.delete({ where: { id: customer.id } });
  });
});
