import { Module } from "@nestjs/common";
import { PrismaModule } from "./common/prisma.module.js";
import { ConfigModule } from "./config/config.module.js";
import { AuthModule } from "./common/auth/auth.module.js";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module.js";
import { HealthModule } from "./health/health.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";
import { CartModule } from "./modules/cart/cart.module.js";
import { CheckoutModule } from "./modules/checkout/checkout.module.js";
import { PaymentsModule } from "./modules/payments/payments.module.js";
import { ProvisioningModule } from "./modules/provisioning/provisioning.module.js";
import { CrmModule } from "./modules/crm/crm.module.js";
import { WhatsappModule } from "./modules/whatsapp/whatsapp.module.js";
import { PromotionsModule } from "./modules/promotions/promotions.module.js";
import { SupportModule } from "./modules/support/support.module.js";
import { ContentModule } from "./modules/content/content.module.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { CoverageModule } from "./modules/coverage/coverage.module.js";
import { ConsentModule } from "./modules/consent/consent.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RateLimitModule,
    AuthModule,
    AuditModule,
    HealthModule,
    CatalogModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    ProvisioningModule,
    CrmModule,
    WhatsappModule,
    PromotionsModule,
    SupportModule,
    ContentModule,
    AdminModule,
    CoverageModule,
    ConsentModule,
    NotificationsModule,
  ],
})
export class AppModule {}
