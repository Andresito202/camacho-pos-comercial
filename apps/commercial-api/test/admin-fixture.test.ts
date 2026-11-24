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

describe("admin test fixture (non-production only)", () => {
  let app: import("@nestjs/platform-fastify").NestFastifyApplication;

  beforeAll(async () => {
    const { NestFactory } = await import("@nestjs/core");
    const { FastifyAdapter } = await import("@nestjs/platform-fastify");
    const { AppModule } = await import("../src/app.module.js");

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
  });

  it("accepts X-Admin-Test-Fixture when ALLOW_ADMIN_TEST_FIXTURE=1", async () => {
    const server = app.getHttpAdapter().getInstance();
    const res = await server.inject({
      method: "GET",
      url: "/v1/admin/catalog/plans",
      headers: { "x-admin-test-fixture": "GLOBAL_SUPERADMIN" },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("still rejects requests without the fixture header", async () => {
    const server = app.getHttpAdapter().getInstance();
    const res = await server.inject({
      method: "GET",
      url: "/v1/admin/catalog/plans",
    });
    expect(res.statusCode).toBe(401);
  });
});
