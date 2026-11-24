import { createHash } from "node:crypto";
import { HttpException, HttpStatus, Inject, Injectable, Logger, Optional } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";

type CaptchaProvider = "turnstile" | "recaptcha" | "none";

type VerifyFn = (
  provider: "turnstile" | "recaptcha",
  token: string,
  remoteIp?: string,
) => Promise<{ success: boolean; errorCodes?: string[]; score?: number }>;

/**
 * Verifies Cloudflare Turnstile or Google reCAPTCHA tokens server-side.
 * Rejects missing, invalid, expired (provider-side), and locally reused tokens.
 */
@Injectable()
export class CaptchaService {
  private readonly log = new Logger(CaptchaService.name);
  /** Injectable verifier for negative tests — production uses live HTTP. */
  verifyFn: VerifyFn | null = null;

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Optional() @Inject(PRISMA) private readonly prisma?: PrismaClient,
  ) {}

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

    const tokenHash = createHash("sha256").update(token.trim()).digest("hex");
    await this.assertNotReused(tokenHash);

    const result = this.verifyFn
      ? await this.verifyFn(provider, token.trim(), remoteIp)
      : provider === "turnstile"
        ? await this.verifyTurnstile(token.trim(), remoteIp)
        : await this.verifyRecaptcha(token.trim(), remoteIp);

    if (!result.success) {
      const codes = result.errorCodes ?? [];
      const expired = codes.some((c) => /timeout|expired/i.test(c));
      throw new HttpException(
        {
          code: expired ? "CAPTCHA_EXPIRED" : "CAPTCHA_FAILED",
          message: expired
            ? "La verificación anti-bot expiró. Inténtalo de nuevo."
            : "Verificación anti-bot fallida.",
          details: codes,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const score = "score" in result ? result.score : undefined;
    if (typeof score === "number" && score < 0.3) {
      throw new HttpException(
        { code: "CAPTCHA_LOW_SCORE", message: "Verificación anti-bot rechazada." },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.recordUse(tokenHash, provider);
  }

  private async assertNotReused(tokenHash: string): Promise<void> {
    if (!this.prisma) return;
    const existing = await this.prisma.captchaTokenUse.findUnique({ where: { tokenHash } });
    if (existing) {
      throw new HttpException(
        { code: "CAPTCHA_REUSED", message: "El token anti-bot ya fue utilizado." },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async recordUse(tokenHash: string, provider: string): Promise<void> {
    if (!this.prisma) return;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.captchaTokenUse.create({
      data: { tokenHash, provider, expiresAt },
    });
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
    return { success: Boolean(data.success), errorCodes: data["error-codes"] };
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
    return { success: Boolean(data.success), errorCodes: data["error-codes"], score: data.score };
  }
}
