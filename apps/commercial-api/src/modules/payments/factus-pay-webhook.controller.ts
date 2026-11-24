import { Inject, Body, Controller, Header, Headers, Post, Query, Req } from "@nestjs/common";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service.js";
import { PaymentsService } from "./payments.service.js";

/** Preferred auth for Factus Pay webhooks (avoids key in URL/logs). Query `key` remains for provider compat. */
export const FACTUS_PAY_WEBHOOK_KEY_HEADER = "x-factus-pay-webhook-key" as const;

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
    @Headers(FACTUS_PAY_WEBHOOK_KEY_HEADER) headerKey: string | undefined,
    @Req() req: { ip?: string },
  ) {
    await this.rateLimit.assertAsync(`webhook:factus:${req.ip ?? "unknown"}`, 120, 60_000);
    const suppliedKey = (headerKey?.trim() || key?.trim() || null) as string | null;
    const { result } = await this.payments.handleFactusPayWebhook({
      body,
      suppliedKey,
    });
    return { result };
  }
}
