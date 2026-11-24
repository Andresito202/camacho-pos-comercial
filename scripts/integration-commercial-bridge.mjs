#!/usr/bin/env node
/**
 * Cross-repo integration evidence: Central commercial bridge ↔ commercial-api.
 * Does NOT enable Factus PRODUCTION charges. Uses shared secrets + real HTTP.
 */
import { spawn, execSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POS = path.resolve(ROOT, "../pos-platform");
const BRIDGE_KEY = "integration-bridge-key-min-32-chars-xx";
const TRIAL_KEY = "integration-trial-webhook-key-min-32-x";
const BRIDGE_PORT = 18443;
const API_PORT = 4011;

function freePort(port) {
  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
  } catch {
    /* nothing listening */
  }
}
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://comercial:comercial_dev@127.0.0.1:5432/camacho_pos_comercial?schema=public";

function run(cmd, args, env, cwd) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (d) => {
    out += d.toString();
  });
  child.stderr.on("data", (d) => {
    out += d.toString();
  });
  return {
    child,
    output: () => out,
    stop: () =>
      new Promise((resolve) => {
        child.kill("SIGTERM");
        child.once("exit", () => resolve());
      }),
  };
}

async function waitHealth(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  throw new Error(`health timeout ${url}`);
}

async function post(url, body, headers = {}) {
  const raw = JSON.stringify(body);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(raw).toString(),
      ...headers,
    },
    body: raw,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

const evidence = [];
function ok(name, detail) {
  evidence.push({ name, ok: true, detail });
  console.log(`PASS ${name}`, detail ?? "");
}
function fail(name, detail) {
  evidence.push({ name, ok: false, detail });
  console.error(`FAIL ${name}`, detail ?? "");
}

freePort(BRIDGE_PORT);
freePort(API_PORT);
await sleep(500);

const bridge = run(
  "pnpm",
  ["--filter", "@pos-platform/central-authority", "commercial-bridge:standalone"],
  {
    NODE_ENV: "development",
    CENTRAL_BRIDGE_TEST_GATE: "1",
    COMMERCIAL_BRIDGE_KEY: BRIDGE_KEY,
    CENTRAL_TRIAL_WEBHOOK_KEY: TRIAL_KEY,
    COMMERCIAL_BRIDGE_PORT: String(BRIDGE_PORT),
  },
  POS,
);

let api;
try {
  await waitHealth(`http://127.0.0.1:${BRIDGE_PORT}/health`);
  ok("bridge_health", `:${BRIDGE_PORT}`);

  api = run(
    "pnpm",
    ["--filter", "@camacho-pos-comercial/commercial-api", "exec", "tsx", "src/main.ts"],
    {
      // NODE_ENV=test skips CSRF Origin gate used for browser forms; bridge callbacks unaffected.
      NODE_ENV: "test",
      PORT: String(API_PORT),
      DATABASE_URL,
      FACTUS_PAY_MODE: "SANDBOX",
      FACTUS_PAY_SANDBOX_ENABLED: "true",
      FACTUS_PAY_SANDBOX_WEBHOOK_KEY: "dev_sandbox_webhook_key_min_32_chars_xx",
      FACTUS_PAY_PRODUCTION_ENABLED: "false",
      CENTRAL_AUTHORITY_ORIGIN: `http://127.0.0.1:${BRIDGE_PORT}`,
      CENTRAL_SESSION_BRIDGE_ENABLED: "true",
      COMMERCIAL_BRIDGE_KEY: BRIDGE_KEY,
      CENTRAL_TRIAL_WEBHOOK_KEY: TRIAL_KEY,
      WHATSAPP_BUSINESS_NUMBER: "573000000000_DEV_PLACEHOLDER",
      PUBLIC_SITE_ORIGIN: "https://camachoposcolombia.com",
      CAPTCHA_REQUIRED_IN_PRODUCTION: "false",
      RATE_LIMIT_DURABLE: "true",
      COMMERCIAL_API_PUBLIC_ORIGIN: `http://127.0.0.1:${API_PORT}`,
      ALLOW_ADMIN_TEST_FIXTURE: "1",
    },
    ROOT,
  );

  await waitHealth(`http://127.0.0.1:${API_PORT}/health`);
  ok("commercial_api_health", `:${API_PORT}`);

  // 1) GLOBAL mint requires verified GLOBAL MFA session — bridge key alone must 401.
  const denied = await post(
    `http://127.0.0.1:${BRIDGE_PORT}/v1/sessions/commercial-bridge/mint`,
    { role: "SUPERADMIN_GLOBAL", jti: `mint-denied-${Date.now()}` },
    { "x-central-commercial-bridge-key": BRIDGE_KEY },
  );
  if (denied.status !== 401) throw new Error(`expected GLOBAL_SESSION_REQUIRED got ${denied.status}`);
  ok("central_mint_requires_global_mfa", denied.json.code);

  // Lab harness proves mint+introspect with ExplicitTestGlobalSessionGate headers (not product login).
  const globalUser = randomUUID();
  const globalSession = randomUUID();
  const minted = await post(
    `http://127.0.0.1:${BRIDGE_PORT}/v1/sessions/commercial-bridge/mint`,
    { role: "SUPERADMIN_GLOBAL", jti: `mint-${Date.now()}` },
    {
      "x-central-commercial-bridge-key": BRIDGE_KEY,
      "x-test-global-session-id": globalSession,
      "x-test-global-user-id": globalUser,
    },
  );
  if (minted.status !== 200 || !minted.json.accessToken) throw new Error("mint failed");
  ok("central_mint_global_with_mfa_gate", minted.json.subjectId);

  const introspect = await post(
    `http://127.0.0.1:${BRIDGE_PORT}/v1/sessions/introspect`,
    { audience: "commercial-portal" },
    { authorization: `Bearer ${minted.json.accessToken}` },
  );
  if (!introspect.json.active || introspect.json.role !== "SUPERADMIN_GLOBAL") {
    throw new Error(`introspect failed ${JSON.stringify(introspect.json)}`);
  }
  ok("central_introspect_global", introspect.json.authority);

  // 2) Create PENDING trial on commercial, then Central issue + callback activate
  const captchaToken = `integration-captcha-${randomBytes(8).toString("hex")}`;
  const trialEmail = `integration.trial.${Date.now()}@example.com`;
  // Captcha provider none in this env — OK for development
  const trial = await post(`http://127.0.0.1:${API_PORT}/v1/crm/trial`, {
    fullName: "Integration Trial",
    email: trialEmail,
    phoneE164: "+573009990001",
    companyName: "Integration Co",
    consentDataTreatment: true,
    consentTerms: true,
    website: "",
    captchaToken,
  });
  if (trial.status >= 300 || trial.json.status !== "PENDING_ACTIVATION") {
    throw new Error(`trial create ${trial.status} ${JSON.stringify(trial.json)}`);
  }
  ok("commercial_trial_pending", trial.json.id);

  const issue = await post(
    `http://127.0.0.1:${BRIDGE_PORT}/v1/commercial/trial/issue`,
    {
      trialId: trial.json.id,
      email: trialEmail,
      trialHours: 120,
      commercialApiOrigin: `http://127.0.0.1:${API_PORT}`,
      jti: `issue-${trial.json.id}`,
    },
    { "x-central-commercial-bridge-key": BRIDGE_KEY },
  );
  if (issue.status !== 200 || issue.json.trialHours !== 120) {
    throw new Error(`trial issue ${issue.status} ${JSON.stringify(issue.json)}`);
  }
  ok("central_trial_issue_120h", {
    activation: issue.json.commercialActivation,
    ref: issue.json.centralLicenseRef,
  });

  const status = await fetch(`http://127.0.0.1:${API_PORT}/v1/crm/trial/${trial.json.id}`, {
    headers: { "x-trial-access-token": trial.json.accessToken },
  });
  const statusJson = await status.json();
  if (statusJson.status !== "ACTIVE" || !statusJson.posLicenseProvisioning?.activated) {
    throw new Error(`trial not activated ${JSON.stringify(statusJson)}`);
  }
  const hours =
    (Date.parse(statusJson.expiresAt) - Date.parse(statusJson.startsAt)) / (60 * 60 * 1000);
  if (hours !== 120) throw new Error(`expected 120h got ${hours}`);
  ok("commercial_activated_from_central_callback", { hours, status: statusJson.status });

  // 3) Provisioning idempotent round-trip (no Factus production)
  const orderId = `integration-order-${Date.now()}`;
  const idem = createHash("sha256").update(`provision:${orderId}`).digest("hex");
  const payload = {
    orderId,
    orderNumber: "CPC-INT-1",
    customerEmail: "buyer@example.com",
    licenseUnits: 1,
    cajaRule: "ONE_LICENSE_ONE_CAJA",
    items: [{ label: "Software", quantity: 1, planId: "p1" }],
  };
  const p1 = await post(`http://127.0.0.1:${BRIDGE_PORT}/v1/commercial/provisioning`, payload, {
    "x-central-commercial-bridge-key": BRIDGE_KEY,
    "idempotency-key": idem,
  });
  const p2 = await post(`http://127.0.0.1:${BRIDGE_PORT}/v1/commercial/provisioning`, payload, {
    "x-central-commercial-bridge-key": BRIDGE_KEY,
    "idempotency-key": idem,
  });
  if (p1.json.status !== "ACCEPTED" || p2.json.status !== "DUPLICATE") {
    throw new Error(`provisioning ${JSON.stringify({ p1, p2 })}`);
  }
  ok("central_provisioning_idempotent", p1.json.provisioningId);

  const failed = evidence.filter((e) => !e.ok);
  if (failed.length) process.exitCode = 1;
  console.log(
    JSON.stringify(
      {
        result: failed.length ? "FAIL" : "PASS",
        evidence,
        note: "No Factus PRODUCTION charges; trial activation via Central webhook only",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error);
  console.error("bridge log:\n", bridge.output());
  if (api) console.error("api log:\n", api.output());
  process.exitCode = 1;
} finally {
  if (api) await api.stop();
  await bridge.stop();
}
