#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:https";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

// Explicit opt-in. Run against a disposable loopback cluster exclusively.
// Both databases are created with fresh names and retained for inspection.
const portalRepo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const posRepo = process.env.CAMACHO_POS_REPO;
const postgres = process.env.BRIDGE_PG_ADMIN_URL;
if (process.env.CAMACHO_BRIDGE_LAB !== "1" || !posRepo || !postgres) {
  throw Error(
    "Set CAMACHO_BRIDGE_LAB=1, CAMACHO_POS_REPO, and BRIDGE_PG_ADMIN_URL for a disposable cluster",
  );
}
const adminUrl = new URL(postgres);
if (
  adminUrl.hostname !== "127.0.0.1" ||
  !adminUrl.port ||
  adminUrl.port === "5432" ||
  adminUrl.pathname !== "/postgres" ||
  adminUrl.searchParams.get("sslmode") !== "verify-full" ||
  !adminUrl.searchParams.get("sslrootcert")
) {
  throw Error(
    "A disposable loopback PostgreSQL server with verify-full TLS is required",
  );
}

const require = createRequire(
  join(portalRepo, "apps/commercial-api/package.json"),
);
const { register } = await import(
  pathToFileURL(require.resolve("tsx/esm/api")).href
);
register();
const fromPos = (file) => import(pathToFileURL(resolve(posRepo, file)).href);
const migration = (name) => fromPos(`tools/target-migrations/src/${name}.ts`);
const [
  { createPostgresPool },
  { uuidV7 },
  { applyPostgres001, applyPostgres002 },
  { applyRoleReadiness },
  { applyPostgres003 },
  { applyPostgres004 },
  { applyPostgres005 },
  { applyPostgres006 },
  { applyPostgres007 },
  { applyCommercialMigrations },
  {
    CommercialPortalBridgeService,
    PostgresCommercialLicenseIssuer,
    PostgresCommercialPortalBridgeStore,
    createCommercialPortalBridgeHandler,
  },
  { ExplicitTestGlobalSessionGate },
  { businessTestTls },
] = await Promise.all([
  fromPos("packages/database-postgres/src/index.ts"),
  fromPos("packages/contracts/src/index.ts"),
  migration("postgres"),
  migration("postgres-003-role-readiness"),
  migration("postgres-003-runner"),
  migration("postgres-004-runner"),
  migration("postgres-005-runner"),
  migration("postgres-006-runner"),
  migration("postgres-007-runner"),
  migration("postgres-commercial-runner"),
  fromPos("apps/central-authority/src/commercial-portal-bridge/index.ts"),
  fromPos("apps/central-authority/tests/commercial-portal-test-gate.ts"),
  fromPos("apps/central-authority/tests/helpers/business-test-tls.ts"),
]);
const execPortal = (args, env = {}) =>
  execFileSync("corepack", ["pnpm", ...args], {
    cwd: portalRepo,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
execPortal(["prisma:generate"]);
execPortal(["build"]);
const { PrismaClient } = await import(
  pathToFileURL(join(portalRepo, "packages/database/dist/index.js")).href
);
const data = await mkdtemp(join(tmpdir(), "camacho-bridge-"));
const control = createPostgresPool(postgres, 2);
const random = randomBytes(6).toString("hex");
const centralDatabase = "test_bridge_central_" + random;
const portalDatabase = "test_bridge_portal_" + random;
function databaseUrl(db, role = adminUrl.username) {
  const url = new URL(postgres);
  url.username = role;
  url.pathname = "/" + db;
  return url.href;
}
const centralAdminUrl = databaseUrl(centralDatabase);
const portalUrl = databaseUrl(portalDatabase);
const runtimeUrl = databaseUrl(centralDatabase, "pos_platform_app");
let http, portal, prisma, central, runtime;
const environmentId = "PORTAL_BRIDGE_LAB";
const repositoryCommit = execFileSync(
  "git",
  ["-C", posRepo, "rev-parse", "HEAD"],
  { encoding: "utf8" },
).trim();
try {
  for (const database of [centralDatabase, portalDatabase])
    await control.query(`CREATE DATABASE "${database}"`);
  const migrationConfig = {
    adminUrl: centralAdminUrl,
    expectedDatabase: centralDatabase,
    repositoryCommit,
  };
  await applyPostgres001(migrationConfig);
  await applyPostgres002(migrationConfig);
  await applyRoleReadiness({
    provisioningUrl: databaseUrl(centralDatabase, "pos_migrator"),
    verificationUrl: databaseUrl(centralDatabase, "pos_platform_admin"),
    environmentId,
    expectedDatabase: centralDatabase,
    repositoryCommit,
    operatorOrJobId: "bridge-lab",
    receiptOutputPath: join(data, "readiness.json"),
  });
  await applyPostgres003({
    ...migrationConfig,
    environmentId,
    receiptOutputPath: join(data, "receipt.json"),
  });
  await applyPostgres004(migrationConfig);
  await applyPostgres005(migrationConfig);
  await applyPostgres006(migrationConfig);
  await applyPostgres007(migrationConfig);
  const migratorConfig = {
    migratorUrl: databaseUrl(centralDatabase, "pos_migrator"),
    expectedDatabase: centralDatabase,
    repositoryCommit,
    lockTimeoutMs: 5_000,
    statementTimeoutMs: 20_000,
  };
  await applyCommercialMigrations({
    ...migratorConfig,
    target: "LICENSE_CATALOG",
  });
  await applyCommercialMigrations({
    ...migratorConfig,
    target: "COMMERCIAL_PORTAL_BRIDGE",
  });
  execPortal(["prisma:migrate:deploy"], { DATABASE_URL: portalUrl });
  central = createPostgresPool(centralAdminUrl, 2);
  runtime = createPostgresPool(runtimeUrl, 3);
  prisma = new PrismaClient({ datasourceUrl: portalUrl });
  const tenantId = uuidV7(),
    planId = uuidV7();
  await central.query(
    "INSERT INTO tenancy.tenants(id,name,status,created_at,updated_at) VALUES($1,'Engineering fixture','ACTIVE',now(),now())",
    [tenantId],
  );
  await central.query(
    `INSERT INTO licensing.plans(id,code,name,billing_model,deployment_mode,currency_code,price_minor,status,created_at,updated_at)
    VALUES($1,$2,'Engineering fixture','PERPETUAL','LOCAL_PERPETUAL','COP',49900,'ACTIVE',now(),now())`,
    [planId, "LAB_" + random],
  );
  await central.query(
    `INSERT INTO licensing.plan_entitlements(id,plan_id,capability_code,enabled,limit_type,limit_value,created_at)
    VALUES($1,$2,'CASH_REGISTER',true,'FINITE',1,now())`,
    [uuidV7(), planId],
  );

  const bridgeKey = randomBytes(32).toString("hex"),
    webhookKey = randomBytes(32).toString("hex");
  const bridgeStore = new PostgresCommercialPortalBridgeStore(runtime);
  const gate = new ExplicitTestGlobalSessionGate();
  const handler = createCommercialPortalBridgeHandler(
    new CommercialPortalBridgeService(bridgeStore, {
      bridgeKey,
      trialWebhookKey: randomBytes(32).toString("hex"),
      licenseIssuer: new PostgresCommercialLicenseIssuer(runtime),
      recoverBoundProvisioning: true,
    }),
    gate,
  );
  const tls = businessTestTls();
  const ca = join(data, "test-ca.pem");
  await writeFile(ca, tls.cert);
  http = createServer(
    tls,
    (request, response) => void handler(request, response),
  );
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  const centralPort = http.address().port;
  const client = await prisma.commercialCustomer.create({
    data: { email: `${random}@example.test`, fullName: "Engineering fixture" },
  });
  const profile = await prisma.businessProfile.create({
    data: {
      customerId: client.id,
      legalName: "Engineering fixture",
      centralTenantId: tenantId,
    },
  });
  const plan = await prisma.plan.create({
    data: { slug: "bridge-lab-" + random, name: "Lab", description: "Lab" },
  });
  const price = await prisma.planPrice.create({
    data: {
      planId: plan.id,
      amountCents: 49900,
      version: 1,
      billingInterval: "PERPETUAL",
      centralPlanId: planId,
    },
  });
  const order = await prisma.order.create({
    data: {
      customerId: client.id,
      businessProfileId: profile.id,
      orderNumber: random,
      idempotencyKey: randomUUID(),
      subtotalCents: 49900,
      totalCents: 49900,
      status: "PENDING_PAYMENT",
      items: {
        create: {
          label: "Lab",
          planId: plan.id,
          planPriceId: price.id,
          priceVersion: 1,
          unitAmountCents: 49900,
          lineTotalCents: 49900,
          quantity: 1,
        },
      },
    },
  });
  const referenceCode = "CPC-PAY-" + randomUUID();
  await prisma.payment.create({
    data: {
      referenceCode,
      orderId: order.id,
      customerId: client.id,
      provider: "FACTUS_PAY",
      environment: "SANDBOX",
      status: "PENDING",
      amountCents: 49900,
    },
  });
  portal = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import {NestFactory} from "@nestjs/core";
    import {FastifyAdapter} from "@nestjs/platform-fastify";
    import {AppModule} from "./dist/app.module.js";
    const app = await NestFactory.create(AppModule,new FastifyAdapter({logger:false}),{logger:false});
    app.setGlobalPrefix("v1",{exclude:["health"]});
    app.enableShutdownHooks();
    await app.listen(0,"127.0.0.1");
    process.send("http://127.0.0.1:" + app.getHttpServer().address().port);
  `,
    ],
    {
      cwd: join(portalRepo, "apps/commercial-api"),
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      env: {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: portalUrl,
        NODE_EXTRA_CA_CERTS: ca,
        CENTRAL_AUTHORITY_ORIGIN: `https://127.0.0.1:${centralPort}`,
        COMMERCIAL_BRIDGE_KEY: bridgeKey,
        COMMERCIAL_PROVISIONING_WORKER_ENABLED: "true",
        FACTUS_PAY_MODE: "SANDBOX",
        FACTUS_PAY_SANDBOX_ENABLED: "true",
        FACTUS_PAY_PRODUCTION_ENABLED: "false",
        FACTUS_PAY_SANDBOX_WEBHOOK_KEY: webhookKey,
      },
    },
  );
  let stderr = "";
  portal.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  portal.stdout.on("data", () => {});
  const origin = await Promise.race([
    once(portal, "message").then(([address]) => address),
    once(portal, "exit").then(() => {
      throw Error("Portal lab startup failed: " + stderr);
    }),
    delay(10_000, null, { ref: false }).then(() => {
      throw Error("Portal lab startup timeout");
    }),
  ]);
  assert.equal((await fetch(origin + "/health")).status, 200);
  const event = {
    data: { reference_code: referenceCode, amount: 49900, status: "paid" },
  };
  const pay = () =>
    fetch(origin + "/v1/webhooks/factus-pay/collections", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-factus-pay-webhook-key": webhookKey,
      },
      body: JSON.stringify(event),
    });
  assert.equal((await (await pay()).json()).result, "STORED");
  assert.equal((await (await pay()).json()).result, "DUPLICATE");
  let licenseId;
  await reconcile(
    async () => {
      const request = await prisma.provisioningRequest.findUniqueOrThrow({
        where: {
          idempotencyKey: createHash("sha256")
            .update(`provision:${order.id}`)
            .digest("hex"),
        },
      });
      assert.equal(request.status, "SENT", request.lastError ?? undefined);
      const receipt = await bridgeStore.getProvisioningByIdempotency(
        request.idempotencyKey,
      );
      assert.equal(receipt?.fulfillment, "ISSUED");
      assert.equal(receipt?.tenantId, tenantId);
      assert.equal(receipt?.licenseIds?.length, 1);
      licenseId = receipt.licenseIds[0];
      assert.equal(
        (
          await central.query(
            "SELECT tenant_id FROM licensing.licenses WHERE id=$1",
            [licenseId],
          )
        ).rows[0]?.tenant_id,
        tenantId,
      );
      assert.equal(
        (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
          .status,
        "PROVISIONING",
      );
      const status = await (
        await fetch(origin + `/v1/payments/${referenceCode}`)
      ).json();
      assert.equal(status.commercialStatus, "PENDING_ACTIVATION");
    },
    15_000,
    () => stderr,
  );
  console.log(
    JSON.stringify({
      webhook: "STORED_AND_DUPLICATE",
      scheduler: "AUTO_DISPATCH",
      transport: "TLS_VERIFIED",
      centralReceipt: "ISSUED",
      licensePersisted: Boolean(licenseId),
      portalOrder: "PROVISIONING",
      paymentStatus: "PENDING_ACTIVATION",
      centralDatabase,
      portalDatabase,
      repositoryCommit,
    }),
  );
} finally {
  if (portal?.exitCode === null) {
    portal.kill("SIGTERM");
    await once(portal, "exit");
  }
  if (http) await new Promise((resolve) => http.close(resolve));
  await Promise.all([
    prisma?.$disconnect(),
    runtime?.end(),
    central?.end(),
    control.end(),
  ]);
}
async function reconcile(assertion, timeout, diagnostics) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      await assertion();
      return;
    } catch (e) {
      if (Date.now() > deadline) throw new Error(diagnostics(), { cause: e });
      await delay(200);
    }
  }
}
