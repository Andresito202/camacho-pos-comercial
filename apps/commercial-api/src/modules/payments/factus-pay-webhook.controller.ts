import { Inject, Body, Controller, Header, Post, Query, Req } from "@nestjs/common";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service.js";
import { PaymentsService } from "./payments.service.js";

@Controller("webhooks/factus-pay")
export class FactusPayWebhookController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Post("collections")
  @Header("cache-control", "no-store")
  async collections(
    @Body() body: unknown,
    @Query("key") key: string | undefined,
    @Req() req: { ip?: string },
  ) {
    this.rateLimit.assert(`webhook:factus:${req.ip ?? "unknown"}`, 120, 60_000);
    const { result } = await this.payments.handleFactusPayWebhook({
      body,
      suppliedKey: key ?? null,
    });
    return { result };
  }
}
