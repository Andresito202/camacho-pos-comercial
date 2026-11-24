import { Inject, Injectable, Logger } from "@nestjs/common";
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
  mock: boolean;
}

/**
 * Commercial-api FACTUS Pay adapter.
 * Can call provider sandbox OR Central subscription gateway.
 * SANDBOX mock is CLEARLY labeled and DISABLED when NODE_ENV=production without real config.
 */
@Injectable()
export class FactusPayAdapter {
  private readonly logger = new Logger(FactusPayAdapter.name);

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  async createCollection(input: FactusCollectionRequest): Promise<FactusCollectionResult> {
    const env = this.config.env;
    const environment = env.FACTUS_PAY_MODE;

    if (environment === "PRODUCTION") {
      if (!env.FACTUS_PAY_PRODUCTION_ENABLED) {
        throw new Error("FACTUS_PAY_PRODUCTION_DISABLED");
      }
      if (!env.FACTUS_PAY_PRODUCTION_CLIENT_ID || !env.FACTUS_PAY_PRODUCTION_CLIENT_SECRET) {
        throw new Error("FACTUS_PAY_PRODUCTION_CREDENTIALS_MISSING");
      }
    }

    if (env.FACTUS_PAY_USE_CENTRAL_GATEWAY) {
      return this.createViaCentralGateway(input, environment);
    }

    if (this.config.factusSandboxMockAllowed()) {
      this.logger.warn(
        "SANDBOX_MOCK: FACTUS Pay credentials missing — using CLEARLY LABELED sandbox mock. Disabled in production.",
      );
      return {
        referenceCode: input.referenceCode,
        amountCents: input.amountCents,
        status: "pending",
        qrPayload: `SANDBOX_MOCK_QR:${input.referenceCode}:${input.amountCents}`,
        provider: "SANDBOX_MOCK",
        environment: "SANDBOX",
        mock: true,
      };
    }

    return this.createViaProvider(input, environment);
  }

  private async createViaCentralGateway(
    input: FactusCollectionRequest,
    environment: "SANDBOX" | "PRODUCTION",
  ): Promise<FactusCollectionResult> {
    const origin = this.config.env.CENTRAL_AUTHORITY_ORIGIN?.trim();
    if (!origin) {
      throw new Error("PENDING_CENTRAL_CREDENTIALS");
    }
    const path = this.config.env.CENTRAL_FACTUS_PAY_GATEWAY_PATH;
    const response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        reference_code: input.referenceCode,
        amount: String(input.amountCents),
        expiration_seconds: input.expirationSeconds ?? 900,
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
      mock: false,
    };
  }

  private async createViaProvider(
    input: FactusCollectionRequest,
    environment: "SANDBOX" | "PRODUCTION",
  ): Promise<FactusCollectionResult> {
    const baseUrl =
      environment === "PRODUCTION"
        ? this.config.env.FACTUS_PAY_PRODUCTION_BASE_URL
        : this.config.env.FACTUS_PAY_SANDBOX_BASE_URL;
    const clientId =
      environment === "PRODUCTION"
        ? this.config.env.FACTUS_PAY_PRODUCTION_CLIENT_ID
        : this.config.env.FACTUS_PAY_SANDBOX_CLIENT_ID;
    const clientSecret =
      environment === "PRODUCTION"
        ? this.config.env.FACTUS_PAY_PRODUCTION_CLIENT_SECRET
        : this.config.env.FACTUS_PAY_SANDBOX_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("FACTUS_PAY_CREDENTIALS_MISSING");
    }

    // OAuth + collection create — real provider path when credentials present.
    const tokenRes = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!tokenRes.ok) {
      throw new Error(`FACTUS_PAY_AUTH_${tokenRes.status}`);
    }
    const tokenBody = (await tokenRes.json()) as { access_token?: string };
    if (!tokenBody.access_token) {
      throw new Error("FACTUS_PAY_AUTH_TOKEN_MISSING");
    }

    const createRes = await fetch(`${baseUrl}/v1/collections`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenBody.access_token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        reference_code: input.referenceCode,
        amount: String(input.amountCents),
        expiration_seconds: input.expirationSeconds ?? 900,
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
      environment,
      mock: false,
    };
  }
}
