import { Global, Module } from "@nestjs/common";
import { SessionBridgeService } from "./session-bridge.service.js";
import { AdminGuard } from "./admin.guard.js";

@Global()
@Module({
  providers: [SessionBridgeService, AdminGuard],
  exports: [SessionBridgeService, AdminGuard],
})
export class AuthModule {}
