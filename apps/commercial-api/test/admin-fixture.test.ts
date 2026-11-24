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

    const restore = await server.inject({
      method: "PATCH",
      url: `/v1/admin/catalog/plan-prices/${planPriceId}`,
      headers: { ...FIXTURE_HEADERS, "content-type": "application/json" },
      payload: { amountCents: originalAmountCents, publish: false },
    });
    expect(restore.statusCode).toBe(200);
    const restoredBody = restore.json() as { amountCents: number };
    expect(restoredBody.amountCents).toBe(originalAmountCents);

    const row = await prisma.planPrice.findUniqueOrThrow({ where: { id: planPriceId } });
    expect(row.amountCents).toBe(originalAmountCents);
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
});
