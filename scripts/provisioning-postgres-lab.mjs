#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from "node:crypto";
import { once } from "node:events";
import { createServer, request as httpsRequest } from "node:https";
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
  { LICENSE_LOCAL_ACCEPTANCE_PATH, uuidV7 },
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
  { GlobalAdministrationSessionGate },
  { businessTestTls },
  { LicenseCapacityAuthority, LICENSE_ACTIVATION_PATH },
  { createLicenseCapacityHandler },
  { GlobalAdministrationSessions },
  { createPlatformPasswordVerifier },
  { createDeviceRequestAuthorization },
  { LocalDatabase },
  { LicenseCapacityGate, readLicenseCapacityProvision },
  { LocalSecurityLifecycle },
  { acknowledgeLicenseLocalAcceptance, downloadLicenseCapacity },
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
  fromPos("apps/central-authority/src/commercial-portal-bridge/global-session-gate.ts"),
  fromPos("apps/central-authority/tests/helpers/business-test-tls.ts"),
  fromPos("apps/central-authority/src/license-capacity-authority.ts"),
  fromPos("apps/central-authority/src/license-capacity-runtime.ts"),
  fromPos("apps/central-authority/src/global-administration-sessions.ts"),
  fromPos("apps/central-authority/src/platform-password-verifier.ts"),
  fromPos("packages/device-trust/src/index.ts"),
  fromPos("packages/database-sqlite/src/index.ts"),
  fromPos("apps/pos-local-service/src/security/license-capacity-gate.ts"),
  fromPos("apps/pos-local-service/src/security/security-lifecycle.ts"),
  fromPos("apps/pos-local-service/src/security/license-capacity-download.ts"),
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
let http, portal, prisma, central, runtime, local, web;
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
  for (const target of ["CASH_REGISTER_MASTER", "COMMERCIAL_AUTHORIZATION", "BUSINESS_OWNER",
    "TENANT_INITIALIZATION", "CASH_REGISTER_BINDINGS", "COMMERCIAL_ORDER_ACTIVATION"]) {
    await applyCommercialMigrations({ ...migratorConfig, target });
  }
  execPortal(["prisma:migrate:deploy"], { DATABASE_URL: portalUrl });
  central = createPostgresPool(centralAdminUrl, 2);
  runtime = createPostgresPool(runtimeUrl, 3);
  prisma = new PrismaClient({ datasourceUrl: portalUrl });
  const tenantId = uuidV7(), companyId = uuidV7(), branchId = uuidV7(), registerId = uuidV7(), planId = uuidV7();
  const deviceId = uuidV7(), installationId = uuidV7(), credentialId = uuidV7();
  const deviceKey = generateKeyPairSync("ed25519"), licenseKey = generateKeyPairSync("ed25519");
  const keyId = "LAB_ORDER_" + random.toUpperCase();
  const pem = key => Buffer.from(key.export({ type: "spki", format: "pem" }));
  const sha = value => createHash("sha256").update(value).digest();
  const policy = { profile: "CAMACHO_LICENSE_ACTIVATION_V1", policy_reference: "BRIDGE_LAB_ONLY",
    subscription_grace_days: 3, grace_basis: "ELAPSED_24_HOURS", perpetual_use: "NO_EXPIRY",
    support_and_external_services: "SEPARATE", accepted_contract_policy_references: ["COMMERCIAL_ORDER_V1"],
    offline_capabilities: ["CASH_REGISTER"] };
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

  await central.query(`INSERT INTO organization.companies
    (id,tenant_id,trade_name,timezone,currency_code,status,created_at,updated_at)
    VALUES($1,$2,'Fixture','America/Bogota','COP','ACTIVE',now(),now())`, [companyId, tenantId]);
  await central.query(`INSERT INTO organization.branches(id,tenant_id,company_id,name,timezone,status,created_at,updated_at)
    VALUES($1,$2,$3,'Fixture','America/Bogota','ACTIVE',now(),now())`, [branchId, tenantId, companyId]);
  await central.query(`INSERT INTO cash.cash_registers(id,tenant_id,company_id,branch_id,code,code_normalized,name,currency_code,status)
    VALUES($1,$2,$3,$4,'LAB','lab','Fixture','COP','ACTIVE')`, [registerId, tenantId, companyId, branchId]);
  await central.query(`INSERT INTO identity.device_registry
    (device_id,installation_id,tenant_id,company_id,device_key_id,device_public_key,device_public_key_algorithm,status,
      trust_key_id,trust_key_purpose,created_at,updated_at)
    VALUES($1::uuid,$2,$3,$4,$1::text,$5,'Ed25519','ACTIVE','LAB_TRUST','DEVICE_TRUST',now(),now())`,
    [deviceId, installationId, tenantId, companyId, pem(deviceKey.publicKey)]);
  await central.query(`INSERT INTO identity.device_credentials
    (credential_id,device_id,installation_id,tenant_id,company_id,device_key_id,trust_key_id,key_purpose,status,
      generation,issued_at,expires_at,credential_checksum,issuer_signature,created_at)
    VALUES($1,$2::uuid,$3,$4,$5,$2::text,'LAB_TRUST','DEVICE_TRUST','ACTIVE',1,now(),now()+interval '1 hour',$6,$7,now())`,
    [credentialId, deviceId, installationId, tenantId, companyId, sha(credentialId).toString("hex"), Buffer.alloc(64)]);
  const spki = sha(licenseKey.publicKey.export({ type: "spki", format: "der" }));
  await central.query(`INSERT INTO licensing.trusted_signing_keys
    (key_id,key_purpose,environment,public_key,public_key_checksum,algorithm_id,key_status,valid_from,valid_until)
    VALUES($1,'LICENSE','PREPRODUCTION',$2,$3,'Ed25519','ACTIVE',now()-interval '1 minute',now()+interval '1 hour')`,
    [keyId, pem(licenseKey.publicKey), spki]);
  const authority = new LicenseCapacityAuthority(runtime, policy,
    { keyId, privateKey: licenseKey.privateKey, environment: "PREPRODUCTION" },
    { reauthenticationMs: 300_000, lockTimeoutMs: 3_000, statementTimeoutMs: 10_000 });
  const global = await loginLabGlobal(central, runtime);
  const { sessionId } = global;
  const bridgeKey = randomBytes(32).toString("hex"),
    webhookKey = randomBytes(32).toString("hex");
  const bridgeStore = new PostgresCommercialPortalBridgeStore(runtime);
  const gate = new GlobalAdministrationSessionGate(global.sessions, runtime, global.origin);
  const handler = createCommercialPortalBridgeHandler(
    new CommercialPortalBridgeService(bridgeStore, {
      bridgeKey,
      trialWebhookKey: randomBytes(32).toString("hex"),
      licenseIssuer: new PostgresCommercialLicenseIssuer(runtime),
      recoverBoundProvisioning: true,
      isGlobalSessionActive: value => gate.isSessionActive(value),
    }),
    gate,
    authority,
  );
  const labHost = "bridge-lab.pos.local";
  const tls = businessTestTls(labHost);
  const ca = join(data, "test-ca.pem");
  await writeFile(ca, tls.cert);
  http = createServer(tls);
  http.listen(0, "127.0.0.1");
  await once(http, "listening");
  const centralPort = http.address().port;
  const centralOrigin = `https://${labHost}:${centralPort}`;
  const licenseHttp = createLicenseCapacityHandler(authority, centralOrigin, { requests: 60, buckets: 10, windowMs: 60_000 });
  http.on("request", (request, response) => void (async () => {
    if (!(await handler(request, response))) await licenseHttp(request, response);
  })());
  const transport = (url, options) => new Promise((resolve, reject) => {
    assert.equal(url.hostname, labHost);
    const request = httpsRequest(url, { method: options.method, ca: tls.cert, agent: false, signal: options.signal,
      lookup: (_hostname, options, done) => options.all
        ? done(null, [{ address: "127.0.0.1", family: 4 }]) : done(null, "127.0.0.1", 4),
      headers: { ...options.headers, "content-length": Buffer.byteLength(options.body) } }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => resolve(new Response(Buffer.concat(chunks), {
        status: response.statusCode, headers: response.headers,
      })));
    });
    request.on("error", error => reject(new Error(`HTTPS laboratory request failed for ${url.pathname}`, { cause: error }))).end(options.body);
  });
  const client = await prisma.commercialCustomer.create({
    data: { email: `${random}@example.test`, fullName: "Engineering fixture" },
  });
  const profile = await prisma.businessProfile.create({
    data: {
      customerId: client.id,
      legalName: "Engineering fixture",
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
    },
  });
  const hardware = await prisma.product.create({data:{ slug: "fixture-" + random, sku: "fixture-" + random,
    name: "Periférico de laboratorio", description: "Fixture", kind: "HARDWARE" }});
  const order = await prisma.order.create({
    data: {
      customerId: client.id,
      businessProfileId: profile.id,
      orderNumber: random,
      idempotencyKey: randomUUID(),
      subtotalCents: 59900,
      totalCents: 59900,
      status: "PENDING_PAYMENT",
      items: {
        create: [{
          label: "Lab",
          planId: plan.id,
          planPriceId: price.id,
          priceVersion: 1,
          unitAmountCents: 49900,
          lineTotalCents: 49900,
          quantity: 1,
        }, { label: "Periférico", productId: hardware.id, quantity: 1, priceVersion: 1,
          unitAmountCents: 10000, lineTotalCents: 10000 }],
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
      amountCents: 59900,
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
        CENTRAL_SESSION_BRIDGE_ENABLED: "true",
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
  let checkoutPage;
  if (process.env.CAMACHO_BRIDGE_LAB_WEB === "1") {
    const frontend = await startCheckoutWeb(origin);
    web = frontend.process;
    checkoutPage = new URL("/checkout/estado", frontend.origin);
    checkoutPage.searchParams.set("id", referenceCode);
  }
  const checkCheckoutPage = async (label) => {
    if (!checkoutPage) return;
    const response = await fetch(checkoutPage);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(label), `Checkout page did not render: ${label}`);
  };
  const event = {
    data: { reference_code: referenceCode, amount: 59900, status: "paid" },
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
  const statusFromPortal = async () => (await (await fetch(origin + `/v1/payments/${referenceCode}`)).json()).commercialStatus;
  assert.equal(await statusFromPortal(), "WAITING_BINDING");
  const mint = (csrfToken = global.csrfToken) => transport(new URL("/v1/sessions/commercial-bridge/mint", centralOrigin), {
    method: "POST", headers: { "content-type": "application/json", "x-central-commercial-bridge-key": bridgeKey,
      cookie: global.cookie, "x-csrf-token": csrfToken },
    body: JSON.stringify({ role: "SUPERADMIN_GLOBAL", ttlSeconds: 180, jti: uuidV7() }),
  });
  assert.equal((await mint("invalid")).status, 401);
  const minted = await mint();
  assert.equal(minted.status, 200);
  const session = await minted.json();
  const adminAction = (path, method, input, authorize = true) => fetch(origin + path, { method, redirect: "error",
    headers: { "content-type": "application/json", ...(authorize ? { authorization: `Bearer ${session.accessToken}` } : {}) },
    body: JSON.stringify(input) });
  const bindingPath = `/v1/provisioning/orders/${order.id}/binding`;
  const binding = { centralTenantId: tenantId, centralCompanyId: companyId, centralPlanId: planId };
  assert.equal((await adminAction(bindingPath, "POST", binding, false)).status, 403);
  const authorizedBinding = await adminAction(bindingPath, "POST", binding);
  assert.equal(authorizedBinding.status, 201, await authorizedBinding.text());
  const idempotencyKey = sha(`provision:${order.id}`).toString("hex");
  let licenseId, provisioningId;
  const activationStatus = (request = { orderId: order.id, provisioningId }, key = bridgeKey) => transport(
    new URL("/v1/commercial/provisioning/activation-status", centralOrigin),
    { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey,
      "x-central-commercial-bridge-key": key }, body: JSON.stringify(request) },
  );
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
      provisioningId = receipt.provisioningId;
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
  assert.equal((await activationStatus(undefined, "invalid")).status, 403);
  assert.deepEqual((await (await activationStatus()).json()).receipts, []);
  assert.equal((await activationStatus({orderId: order.id, provisioningId: "unknown-order"})).status, 404);
  const assignment = await authority.assignmentContext(sessionId, { licenseId });
  assert.equal(assignment.company.id, companyId);
  const allocation = { license_id: licenseId, credential_id: credentialId,
    allocations: [{ branch_id: branchId, register_id: registerId }],
    idempotency_key: uuidV7(), correlation_id: uuidV7() };
  await assert.rejects(authority.allocate(uuidV7(), allocation), /LICENSE_ISSUE_REQUIRED/);
  await assert.rejects(authority.allocate(sessionId, { ...allocation, allocations: [
    { branch_id: uuidV7(), register_id: registerId },
  ] }), /BRANCH_SCOPE/);
  const activated = await authority.allocate(sessionId, allocation);
  assert.deepEqual(await authority.allocate(sessionId, allocation), { ...activated, idempotent: true });

  const providerProof = (path, { requestId, correlationId, ...payload }) => {
    const body = JSON.stringify(payload);
    return { body, requestId, correlationId, authorization: createDeviceRequestAuthorization({
      method: "POST", path, body, requestId, correlationId, credentialId,
    }, deviceKey.privateKey) };
  };
  const provider = {
    requireVerifiedCredentialId: () => credentialId,
    licenseActivationAuthorization: input => providerProof(LICENSE_ACTIVATION_PATH, input),
    licenseLocalAcceptanceAuthorization: input => providerProof(LICENSE_LOCAL_ACCEPTANCE_PATH, input),
  };
  const scope = { tenantId, companyId, branchId, deviceId, installationId };
  const provisionFile = join(data, "license.json");
  const sqlite = join(data, "sqlite");
  local = LocalDatabase.open({ dataDirectory: sqlite });
  new LocalSecurityLifecycle(local).registerInitialDeviceKey(deviceId);
  const downloaded = await downloadLicenseCapacity({ origin: centralOrigin, activationId: activated.activationId,
    provisionFile, trustKeys: [{ key_id: keyId, public_key_pem: pem(licenseKey.publicKey).toString(),
      spki_sha256: spki.toString("hex"), status: "ACTIVE" }],
    binding: scope, allocation: { branchId, registerId }, database: local, provider,
    timeoutMs: 10_000, signal: AbortSignal.timeout(10_000) }, transport);
  assert.equal(downloaded.status, "STORED");
  assert.deepEqual((await (await activationStatus()).json()).receipts, []);
  const localGate = () => new LicenseCapacityGate(local, () => readLicenseCapacityProvision(provisionFile));
  assert.equal(localGate().authorize(scope, registerId), null);
  local.close();
  local = LocalDatabase.open({ dataDirectory: sqlite });
  assert.equal(localGate().authorize(scope, registerId), null);
  assert.equal(localGate().authorize(scope, uuidV7()), "LICENSE_REGISTER_NOT_ALLOCATED");
  const acceptance = { origin: centralOrigin, activationId: activated.activationId,
    payloadChecksum: downloaded.payloadChecksum, timeoutMs: 10_000, provider };
  await assert.rejects(acknowledgeLicenseLocalAcceptance({ ...acceptance, payloadChecksum: "a".repeat(64) }, transport),
    /ACK_REJECTED/);
  await assert.rejects(acknowledgeLicenseLocalAcceptance(acceptance, async (...args) => {
    const committed = await transport(...args);
    assert.equal(committed.status, 200);
    throw Error("LAB_DROPPED_COMMITTED_ACK_RESPONSE");
  }), /LAB_DROPPED_COMMITTED_ACK_RESPONSE/);
  const ack = await acknowledgeLicenseLocalAcceptance(acceptance, transport);
  assert.deepEqual(await acknowledgeLicenseLocalAcceptance(acceptance, transport), ack);

  await reconcile(async () => {
    assert.equal(await statusFromPortal(), "PENDING_DELIVERY");
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PROVISIONING");
  }, 40_000, () => stderr);
  await checkCheckoutPage("Activación confirmada. Entrega de equipos pendiente.");
  assert.deepEqual((await (await activationStatus()).json()).receipts,
    [{ licenseId, activationId: activated.activationId, receiptId: ack.receiptId }]);
  // Use the admin API for logistics. The existence of a physical delivery is the fixture.
  for (const action of ["MARK_READY", "SHIP", "DELIVER"]) {
    const response = await adminAction(`/v1/admin/pedidos/${order.id}`, "PATCH", { action, ...(action === "SHIP" ? { trackingCode: "LAB-" + random } : {}) });
    assert.equal(response.status, 200, await response.text());
  }
  await reconcile(async () => {
    assert.equal(await statusFromPortal(), "FULFILLED");
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "FULFILLED");
  }, 40_000, () => stderr);
  const finished = await prisma.provisioningRequest.findUniqueOrThrow({ where: { idempotencyKey } });
  assert.equal(finished.status, "ACKNOWLEDGED");
  assert.deepEqual(finished.activationReceipts, [{ licenseId, activationId: activated.activationId, receiptId: ack.receiptId }]);
  assert.equal(await prisma.auditLog.count({ where: { action: "PROVISIONING_ORDER_COMPLETED", entityId: order.id } }), 1);
  assert.equal((await (await pay()).json()).result, "DUPLICATE");
  assert.equal(await statusFromPortal(), "FULFILLED");
  await checkCheckoutPage("Pedido completado.");
  console.log(
    JSON.stringify({
      webhook: "STORED_AND_DUPLICATE",
      scheduler: "AUTO_DISPATCH",
      transport: "TLS_VERIFIED",
      centralReceipt: "ISSUED",
      licensePersisted: Boolean(licenseId),
      globalAllocation: "MFA_AND_SCOPE_VERIFIED",
      portalAdmin: "CENTRAL_BEARER_INTROSPECTED",
      lostResponse: "RECOVERED_SAME_RECEIPT",
      localSQLite: "ACCEPTED_AFTER_RESTART",
      receiptId: ack.receiptId,
      portalStates: ["WAITING_BINDING", "PENDING_ACTIVATION", "PENDING_DELIVERY", "FULFILLED"],
      ...(checkoutPage ? { checkoutPage: "NEXT_SSR_PENDING_DELIVERY_AND_FULFILLED" } : {}),
      centralDatabase,
      portalDatabase,
      repositoryCommit,
    }),
  );
} finally {
  local?.close();
  for (const child of [web, portal]) {
    if (child?.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
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

async function loginLabGlobal(db, pool) {
  const userId = uuidV7(), factorId = uuidV7(), materialId = uuidV7();
  const origin = "https://bridge-lab.pos.local", rpId = "bridge-lab.pos.local";
  const email = "lab-global@example.test", password = randomBytes(24).toString("hex");
  const key = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const credentialId = randomBytes(32).toString("base64url");
  const jwk = key.publicKey.export({ format: "jwk" });
  const cose = Buffer.concat([Buffer.from("a5010203262001215820", "hex"), Buffer.from(jwk.x, "base64url"),
    Buffer.from("225820", "hex"), Buffer.from(jwk.y, "base64url")]);
  await db.query(`INSERT INTO identity.users(id,email,email_normalized,full_name,status,created_at,updated_at)
    VALUES($1,$2,$2,'Laboratorio GLOBAL','ACTIVE',now(),now())`, [userId, email]);
  const assignment = await db.connect();
  try {
    await assignment.query("BEGIN");
    await assignment.query("SELECT set_config('app.audit_id',$1,true),set_config('app.correlation_id',$2,true)",
      [uuidV7(), uuidV7()]);
    const result = await assignment.query(`INSERT INTO "authorization".platform_role_assignments
      (id,user_id,role_id,status,valid_from,created_at,created_by_actor_type)
      SELECT $1,$2,id,'ACTIVE',now(),now(),'SYSTEM' FROM "authorization".roles
        WHERE code='PLATFORM_OWNER' AND scope_type='PLATFORM'`, [uuidV7(), userId]);
    assert.equal(result.rowCount, 1);
    await assignment.query("COMMIT");
  } catch (error) {
    await assignment.query("ROLLBACK");
    throw error;
  } finally {
    assignment.release();
  }
  await db.query(`INSERT INTO identity.user_credentials(id,user_id,credential_type,verifier,status,created_at)
    VALUES($1,$2,'PASSWORD',$3,'ACTIVE',now())`,
    [uuidV7(), userId, await createPlatformPasswordVerifier(password, "owasp-19m-t2-p1")]);
  await db.query(`INSERT INTO identity.mfa_factors(id,user_id,factor_type,secret_reference,status,enrolled_at,verified_at)
    VALUES($1,$2,'WEBAUTHN',$3,'ACTIVE',now(),now())`, [factorId, userId, "webauthn:v1:" + materialId]);
  await db.query(`INSERT INTO identity.webauthn_credential_material(id,factor_id,credential_id,public_key_cose_base64url)
    VALUES($1,$2,$3,$4)`, [materialId, factorId, credentialId, cose.toString("base64url")]);
  const sessions = new GlobalAdministrationSessions(pool, { mode: "DEPLOYMENT", origin, rpId,
    policyReference: "BRIDGE_LAB_ONLY", rejectionVerifier: await createPlatformPasswordVerifier(randomBytes(24).toString("hex"), "owasp-19m-t2-p1"),
    challengeLifetimeMs: 60_000, sessionLifetimeMs: 300_000, maximumMfaAgeMs: 60_000,
    maximumReauthenticationAgeMs: 300_000, browserLifetimeMs: 300_000, idleTimeoutMs: 300_000,
    lockTimeoutMs: 3_000, statementTimeoutMs: 10_000 });
  const { challenge } = await sessions.begin({ email, password, factorId, correlationId: uuidV7() });
  const data = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge, origin, crossOrigin: false }));
  const auth = Buffer.alloc(37);
  createHash("sha256").update(rpId).digest().copy(auth);
  auth[32] = 5;
  auth.writeUInt32BE(1, 33);
  const login = await sessions.complete({ email, password, challenge, response: {
    id: credentialId, rawId: credentialId, type: "public-key", clientExtensionResults: {}, response: {
      clientDataJSON: data.toString("base64url"), authenticatorData: auth.toString("base64url"),
      signature: sign("sha256", Buffer.concat([auth, createHash("sha256").update(data).digest()]), key.privateKey).toString("base64url"),
    },
  } });
  assert.ok(login);
  const session = await sessions.authorize({ cookie: login.setCookie.split(";", 1)[0], csrfToken: login.csrfToken,
    origin, method: "POST", fetchSite: "same-origin" }, "LICENSE_ISSUE");
  assert.ok(session);
  return { sessionId: session, sessions, origin, cookie: login.setCookie.split(";", 1)[0], csrfToken: login.csrfToken };
}


async function startCheckoutWeb(apiOrigin) {
  const child = spawn(process.execPath, ["--input-type=module", "-e", `
    import { createServer } from "node:http";
    import next from "next";
    const app = next({ dev: true, quiet: true });
    await app.prepare();
    const server = createServer(app.getRequestHandler());
    server.listen(0, "127.0.0.1", () => process.send("http://127.0.0.1:" + server.address().port));
  `], {
    cwd: join(portalRepo, "apps/web"),
    stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: { ...process.env, NODE_ENV: "development", COMMERCIAL_API_INTERNAL_URL: apiOrigin,
      NEXT_PUBLIC_API_URL: apiOrigin, NEXT_TELEMETRY_DISABLED: "1" },
  });
  let stderr = "";
  child.stdout.on("data", () => {});
  child.stderr.on("data", chunk => { stderr += String(chunk); });
  try {
    const origin = await Promise.race([
      once(child, "message").then(([address]) => address),
      once(child, "exit").then(() => { throw Error("Checkout web laboratory exited: " + stderr); }),
      delay(20_000, null, { ref: false }).then(() => { throw Error("Checkout web laboratory startup timeout: " + stderr); }),
    ]);
    return { process: child, origin };
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    throw error;
  }
}
