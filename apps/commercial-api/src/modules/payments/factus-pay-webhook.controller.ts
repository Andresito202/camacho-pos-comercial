import { Inject, Body, Controller, Header, Post, Query } from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";

@Controller("webhooks/factus-pay")
export class FactusPayWebhookController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post("collections")
  @Header("cache-control", "no-store")
  async collections(@Body() body: unknown, @Query("key") key: string | undefined) {
    const { result } = await this.payments.handleFactusPayWebhook({
      body,
      suppliedKey: key ?? null,
    });
    return { result };
  }
}
