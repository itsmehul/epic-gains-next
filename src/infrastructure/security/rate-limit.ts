type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Simple in-memory rate limiter (single-process). Swap for Redis in production. */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count += 1;
  return { ok: true as const, remaining: limit - existing.count };
}
