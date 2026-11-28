import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { AppConfigService } from "../../config/config.service.js";
import { ProvisioningService } from "./provisioning.service.js";

const pollIntervalMs = 5_000;

@Injectable()
export class ProvisioningScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ProvisioningScheduler.name);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private active: Promise<void> | undefined;
  private stopping = false;

  constructor(
    @Inject(ProvisioningService) private readonly provisioning: ProvisioningService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.env.COMMERCIAL_PROVISIONING_WORKER_ENABLED || this.config.isProduction) return;
    if (!this.config.centralOrigin() || (this.config.env.COMMERCIAL_BRIDGE_KEY?.trim().length ?? 0) < 32) {
      this.logger.warn("Provisioning scheduler unavailable: Central origin or bridge key missing");
      return;
    }
    this.schedule(0);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    clearTimeout(this.timer);
    await this.active;
  }

  private schedule(delay: number): void {
    this.timer = setTimeout(() => {
      this.active = this.provisioning.processDue(1)
        .then(() => undefined)
        .catch(() => { this.logger.error("Provisioning poll failed"); })
        .finally(() => {
          this.active = undefined;
          if (!this.stopping) this.schedule(pollIntervalMs);
        });
    }, delay);
    this.timer.unref();
  }
}
