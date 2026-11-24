import {
  Inject,
  Body,
  Controller,
  Header,
  Headers,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { RateLimitService } from "../../common/rate-limit/rate-limit.service.js";
import { AppConfigService } from "../../config/config.service.js";
import { PaymentsService } from "./payments.service.js";

/**
 * Prefer Authorization: Bearer <key> or X-Factus-Pay-Webhook-Key.
 * Query ?key= is deprecated (log/Referer leak) and only accepted when
 * FACTUS_PAY_WEBHOOK_ALLOW_QUERY_KEY=true (fail-closed by default).
 */
@Controller("webhooks/factus-pay")
export class FactusPayWebhookController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  @Post("collections")
  @Header("cache-control", "no-store")
  async collections(
    @Body() body: unknown,
    @Query("key") queryKey: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-factus-pay-webhook-key") headerKey: string | undefined,
    @Req() req: { ip?: string },
  ) {
    await this.rateLimit.assertAsync(`webhook:factus:${req.ip ?? "unknown"}`, 120, 60_000);
    const { result } = await this.payments.handleFactusPayWebhook({
      body,
      suppliedKey: this.resolveSuppliedKey({ authorization, headerKey, queryKey }),
    });
    return { result };
  }

  private resolveSuppliedKey(input: {
    authorization: string | undefined;
    headerKey: string | undefined;
    queryKey: string | undefined;
  }): string | null {
    const bearer =
      input.authorization?.startsWith("Bearer ")
        ? input.authorization.slice("Bearer ".length).trim()
        : "";
    if (bearer) return bearer;

    const header = input.headerKey?.trim() ?? "";
    if (header) return header;

    if (this.config.env.FACTUS_PAY_WEBHOOK_ALLOW_QUERY_KEY) {
      const query = input.queryKey?.trim() ?? "";
      if (query) return query;
    }

    return null;
  }
}
