import type { RateLimitRule } from '../config';

interface Bucket {
  hits: number[];
}

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  hit(
    key: string,
    rule: RateLimitRule,
    nowMs: number,
  ): { allowed: boolean; retryAfterSec: number } {
    const bucket = this.buckets.get(key) ?? { hits: [] };
    const fresh = bucket.hits.filter((stamp) => nowMs - stamp < rule.windowMs);
    if (fresh.length >= rule.limit) {
      const oldest = fresh[0] ?? nowMs;
      const retryAfterSec = Math.max(1, Math.ceil((rule.windowMs - (nowMs - oldest)) / 1000));
      bucket.hits = fresh;
      this.buckets.set(key, bucket);
      return { allowed: false, retryAfterSec };
    }
    fresh.push(nowMs);
    bucket.hits = fresh;
    this.buckets.set(key, bucket);
    return { allowed: true, retryAfterSec: 0 };
  }
}
