import { Inject, Injectable, Logger } from "@nestjs/common";
import type { FactusPayGate } from "@camacho-pos-comercial/configuration";
import { AppConfigService } from "../../config/config.service.js";

export interface FactusCollectionRequest {
  referenceCode: string;
  amountCents: number;
  expirationSeconds?: number;
}

export interface FactusCollectionResult {
  referenceCode: string;
  amountCents: number;
  status: string;
  qrPayload: string | null;
  provider: "FACTUS_PAY" | "SANDBOX_MOCK";
  environment: "SANDBOX" | "PRODUCTION";
  gate: FactusPayGate;
  mock: boolean;
}

/**
 * Commercial-api FACTUS Pay adapter — gates:
 *
 * - MOCK: labeled local QR stub. Allowed only when NODE_ENV≠production, MODE=SANDBOX,
 *   sandbox enabled, and credentials missing. Never charges anyone.
 * - SANDBOX: real Factus sandbox HTTP (POST /auth + POST /v1/collections).
 * - PRODUCTION: real Factus production. Requires FACTUS_PAY_PRODUCTION_ENABLED=true
 *   and credentials. Default remains DISABLED.
 *
 * Optional FACTUS_PAY_USE_CENTRAL_GATEWAY proxies create to Central. That path is
 * aspirational: Central's subscription Factus gateway is managed/internal custody
 * (see pos-platform), not a public commercial collection API today.
 *
 * Official docs: https://pay-developers.factus.com.co/
 */
@Injectable()
export class FactusPayAdapter {
  private readonly logger = new Logger(FactusPayAdapter.name);

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  async createCollection(input: FactusCollectionRequest): Promise<FactusCollectionResult> {
    const gate = this.config.factusPayGate();

    if (gate === "PRODUCTION") {
      if (!this.config.env.FACTUS_PAY_PRODUCTION_ENABLED) {
        throw new Error("FACTUS_PAY_PRODUCTION_DISABLED");
      }
      if (!this.config.factusEmail("PRODUCTION") || !this.config.factusPassword("PRODUCTION")) {
        throw new Error("FACTUS_PAY_PRODUCTION_CREDENTIALS_MISSING");
      }
    }

    if (this.config.env.FACTUS_PAY_USE_CENTRAL_GATEWAY) {
      return this.createViaCentralGateway(input, gate);
    }

    if (gate === "MOCK") {
      this.logger.warn(
        "FACTUS_PAY_GATE=MOCK — CLEARLY LABELED sandbox mock. No provider HTTP. Disabled in production.",
      );
      return {
        referenceCode: input.referenceCode,
        amountCents: input.amountCents,
        status: "pending",
        qrPayload: `SANDBOX_MOCK_QR:${input.referenceCode}:${input.amountCents}`,
        provider: "SANDBOX_MOCK",
        environment: "SANDBOX",
        gate: "MOCK",
        mock: true,
      };
    }

    return this.createViaProvider(input, gate);
  }

  private async createViaCentralGateway(
    input: FactusCollectionRequest,
    gate: FactusPayGate,
  ): Promise<FactusCollectionResult> {
    const origin = this.config.centralOrigin();
    if (!origin) {
      throw new Error("PENDING_CENTRAL_CREDENTIALS");
    }
    const path = this.config.env.CENTRAL_FACTUS_PAY_GATEWAY_PATH;
    const environment = gate === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";
    const response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        reference_code: input.referenceCode,
        amount: String(input.amountCents),
        expiration: String(input.expirationSeconds ?? 900),
        environment,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`CENTRAL_FACTUS_GATEWAY_${response.status}`);
    }
    const body = (await response.json()) as { qr?: string; status?: string };
    return {
      referenceCode: input.referenceCode,
      amountCents: input.amountCents,
      status: body.status ?? "pending",
      qrPayload: body.qr ?? null,
      provider: "FACTUS_PAY",
      environment,
      gate,
      mock: false,
    };
  }

  private async createViaProvider(
    input: FactusCollectionRequest,
    gate: "SANDBOX" | "PRODUCTION",
  ): Promise<FactusCollectionResult> {
    const baseUrl =
      gate === "PRODUCTION"
        ? this.config.env.FACTUS_PAY_PRODUCTION_BASE_URL
        : this.config.env.FACTUS_PAY_SANDBOX_BASE_URL;
    const email = this.config.factusEmail(gate);
    const password = this.config.factusPassword(gate);

    if (!email || !password) {
      throw new Error("FACTUS_PAY_CREDENTIALS_MISSING");
    }

    // Official auth: POST /auth with email + password (NOT oauth/token client_credentials).
    // Docs: https://pay-developers.factus.com.co/autenticacion/
    const tokenRes = await fetch(`${baseUrl}/auth`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!tokenRes.ok) {
      throw new Error(`FACTUS_PAY_AUTH_${tokenRes.status}`);
    }
    const tokenBody = (await tokenRes.json()) as { token?: string; access_token?: string };
    const accessToken = tokenBody.token ?? tokenBody.access_token;
    if (!accessToken) {
      throw new Error("FACTUS_PAY_AUTH_TOKEN_MISSING");
    }

    // Official create: POST /v1/collections { reference_code, amount, expiration }
    // Docs: https://pay-developers.factus.com.co/recaudos/crear/
    // amount is COP pesos (commercial stores 1 minor unit = 1 COP peso).
    const createRes = await fetch(`${baseUrl}/v1/collections`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        reference_code: input.referenceCode,
        amount: String(input.amountCents),
        expiration: String(input.expirationSeconds ?? 900),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!createRes.ok) {
      throw new Error(`FACTUS_PAY_CREATE_${createRes.status}`);
    }
    const created = (await createRes.json()) as { data?: { qr?: string; status?: string } };
    return {
      referenceCode: input.referenceCode,
      amountCents: input.amountCents,
      status: created.data?.status ?? "pending",
      qrPayload: created.data?.qr ?? null,
      provider: "FACTUS_PAY",
      environment: gate,
      gate,
      mock: false,
    };
  }
}
