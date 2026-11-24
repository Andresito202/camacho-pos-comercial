import { HttpException, HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { AppConfigService } from "../../config/config.service.js";

type CaptchaProvider = "turnstile" | "recaptcha" | "none";

/**
 * Verifies Cloudflare Turnstile or Google reCAPTCHA tokens.
 * When no secret is configured: non-production allows (honeypot + rate limit still apply);
 * production fails closed if CAPTCHA_REQUIRED_IN_PRODUCTION=true (default).
 */
@Injectable()
export class CaptchaService {
  private readonly log = new Logger(CaptchaService.name);

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  provider(): CaptchaProvider {
    const env = this.config.env;
    if (env.TURNSTILE_SECRET_KEY) return "turnstile";
    if (env.RECAPTCHA_SECRET_KEY) return "recaptcha";
    return "none";
  }

  siteKey(): string | null {
    const env = this.config.env;
    if (env.TURNSTILE_SITE_KEY) return env.TURNSTILE_SITE_KEY;
    if (env.RECAPTCHA_SITE_KEY) return env.RECAPTCHA_SITE_KEY;
    return null;
  }

  publicConfig() {
    const provider = this.provider();
    return {
      provider,
      siteKey: this.siteKey(),
      required:
        provider !== "none" ||
        (this.config.env.NODE_ENV === "production" && this.config.env.CAPTCHA_REQUIRED_IN_PRODUCTION),
    };
  }

  assertHoneypotEmpty(website?: string | null): void {
    if (website != null && String(website).trim() !== "") {
      throw new HttpException(
        { code: "BOT_REJECTED", message: "Solicitud rechazada." },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async verifyOrThrow(token: string | undefined, remoteIp?: string): Promise<void> {
    const env = this.config.env;
    const provider = this.provider();

    if (provider === "none") {
      if (env.NODE_ENV === "production" && env.CAPTCHA_REQUIRED_IN_PRODUCTION) {
        throw new HttpException(
          {
            code: "CAPTCHA_NOT_CONFIGURED",
            message: "La protección anti-bot no está configurada en este entorno.",
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      this.log.debug("Captcha skipped (no secret configured; non-prod or optional)");
      return;
    }

    if (!token || token.trim().length < 10) {
      throw new HttpException(
        { code: "CAPTCHA_REQUIRED", message: "Completa la verificación anti-bot." },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (provider === "turnstile") {
      await this.verifyTurnstile(token, remoteIp);
      return;
    }
    await this.verifyRecaptcha(token, remoteIp);
  }

  private async verifyTurnstile(token: string, remoteIp?: string) {
    const secret = this.config.env.TURNSTILE_SECRET_KEY;
    const body = new URLSearchParams({ secret: secret!, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      throw new HttpException(
        { code: "CAPTCHA_FAILED", message: "Verificación anti-bot fallida.", details: data["error-codes"] },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async verifyRecaptcha(token: string, remoteIp?: string) {
    const secret = this.config.env.RECAPTCHA_SECRET_KEY;
    const body = new URLSearchParams({ secret: secret!, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; score?: number; "error-codes"?: string[] };
    if (!data.success) {
      throw new HttpException(
        { code: "CAPTCHA_FAILED", message: "Verificación anti-bot fallida.", details: data["error-codes"] },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (typeof data.score === "number" && data.score < 0.3) {
      throw new HttpException(
        { code: "CAPTCHA_LOW_SCORE", message: "Verificación anti-bot rechazada." },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
