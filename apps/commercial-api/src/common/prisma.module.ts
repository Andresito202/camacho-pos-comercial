import { Global, Inject, Module, OnModuleDestroy } from "@nestjs/common";
import { createPrismaClient, type PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "./prisma.tokens.js";
import { AppConfigService } from "../config/config.service.js";

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): PrismaClient =>
        createPrismaClient(config.env.DATABASE_URL),
    },
  ],
  exports: [PRISMA],
})
export class PrismaModule implements OnModuleDestroy {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
