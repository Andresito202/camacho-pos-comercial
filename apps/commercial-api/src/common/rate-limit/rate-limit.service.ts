import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

type Bucket = { count: number; resetAt: number };

/**
 * Lightweight in-memory rate limiter (single process).
 * Not a substitute for edge/WAF limits. Documented as PARCIAL in security controls.
 */
@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  /**
   * @throws HttpException 429 when over limit
   */
  assert(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
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
}
