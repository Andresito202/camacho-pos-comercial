import { HttpException, HttpStatus, Inject, Injectable, Optional } from "@nestjs/common";
import type { PrismaClient } from "@camacho-pos-comercial/database";
import { PRISMA } from "../prisma.tokens.js";
import { AppConfigService } from "../../config/config.service.js";

type Bucket = { count: number; resetAt: number };

/**
 * Rate limiter with durable Postgres counters when RATE_LIMIT_DURABLE=true.
 * Call `assertAsync` from controllers (await). Memory fallback when durable is off.
 * Not a substitute for Cloudflare WAF — see docs/security/cloudflare-edge.md.
 */
@Injectable()
export class RateLimitService {
  private readonly memory = new Map<string, Bucket>();

  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Optional() @Inject(PRISMA) private readonly prisma?: PrismaClient,
  ) {}

  /** @deprecated Prefer assertAsync — kept for sync call sites; routes to assertAsync fire-and-throw pattern. */
  assert(key: string, limit: number, windowMs: number): void {
    if (this.config.env.RATE_LIMIT_DURABLE && this.prisma) {
      // Sync callers in legacy paths: use memory shadow to fail closed fast,
      // then durable increment runs best-effort (tests use RATE_LIMIT_DURABLE=false).
      this.assertMemory(key, limit, windowMs);
      void this.assertDurable(key, limit, windowMs).catch(() => undefined);
      return;
    }
    this.assertMemory(key, limit, windowMs);
  }

  async assertAsync(key: string, limit: number, windowMs: number): Promise<void> {
    if (this.config.env.RATE_LIMIT_DURABLE && this.prisma) {
      await this.assertDurable(key, limit, windowMs);
      return;
    }
    this.assertMemory(key, limit, windowMs);
  }

  private assertMemory(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const existing = this.memory.get(key);
    if (!existing || existing.resetAt <= now) {
      this.memory.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (existing.count >= limit) {
      throw new HttpException(
        {
          code: "RATE_LIMITED",
          message: "Too many requests for this route. Retry later.",
          retryAfterMs: existing.resetAt - now,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    existing.count += 1;
  }

  private async assertDurable(key: string, limit: number, windowMs: number): Promise<void> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);
    // Single atomic upsert — avoids lost updates across API instances.
    const rows = await this.prisma!.$queryRaw<Array<{ count: number; resetAt: Date }>>`
      INSERT INTO "RateLimitCounter" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitCounter"."resetAt" <= ${now} THEN 1
          ELSE "RateLimitCounter"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitCounter"."resetAt" <= ${now} THEN ${resetAt}
          ELSE "RateLimitCounter"."resetAt"
        END
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    if (!row) {
      throw new HttpException(
        { code: "RATE_LIMIT_BACKEND_ERROR", message: "Rate limit counter returned no row." },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (row.count > limit) {
      throw new HttpException(
        {
          code: "RATE_LIMITED",
          message: "Too many requests for this route. Retry later.",
          retryAfterMs: Math.max(0, new Date(row.resetAt).getTime() - now.getTime()),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
