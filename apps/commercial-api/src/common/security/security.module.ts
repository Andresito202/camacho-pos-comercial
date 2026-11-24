import { Global, Module } from "@nestjs/common";
import { CaptchaService } from "./captcha.service.js";
import { CsrfService } from "./csrf.service.js";
import { SecurityController } from "./security.controller.js";

@Global()
@Module({
  controllers: [SecurityController],
  providers: [CaptchaService, CsrfService],
  exports: [CaptchaService, CsrfService],
})
export class SecurityModule {}
