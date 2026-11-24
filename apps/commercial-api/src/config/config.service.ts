import { Injectable } from "@nestjs/common";
import {
  loadEnv,
  isFactusSandboxMockAllowed,
  resolveWebhookKey,
  type AppEnv,
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

  webhookKey(): string | null {
    return resolveWebhookKey(this.env);
  }
}
