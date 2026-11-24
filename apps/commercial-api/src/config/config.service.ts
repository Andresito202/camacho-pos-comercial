import { Injectable } from "@nestjs/common";
import {
  loadEnv,
  isFactusSandboxMockAllowed,
  resolveWebhookKey,
  resolveFactusPayGate,
  resolveFactusEmail,
  resolveFactusPassword,
  resolveCentralOrigin,
  type AppEnv,
  type FactusPayGate,
} from "@camacho-pos-comercial/configuration";

@Injectable()
export class AppConfigService {
  readonly env: AppEnv;

  constructor() {
    this.env = loadEnv();
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === "production";
  }

  factusSandboxMockAllowed(): boolean {
    return isFactusSandboxMockAllowed(this.env);
  }

  factusPayGate(): FactusPayGate {
    return resolveFactusPayGate(this.env);
  }

  factusEmail(mode: "SANDBOX" | "PRODUCTION" = this.env.FACTUS_PAY_MODE): string {
    return resolveFactusEmail(this.env, mode);
  }

  factusPassword(mode: "SANDBOX" | "PRODUCTION" = this.env.FACTUS_PAY_MODE): string {
    return resolveFactusPassword(this.env, mode);
  }

  webhookKey(): string | null {
    return resolveWebhookKey(this.env);
  }

  centralOrigin(): string | null {
    return resolveCentralOrigin(this.env);
  }
}
