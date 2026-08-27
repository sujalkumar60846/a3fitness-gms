import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Protects the two PUBLIC, unauthenticated routes: QR check-in and the
 * member self-dashboard lookup. Both trust "knowing the Member Code" —
 * fine for a gym counter, but codes are short and sequential (GYM-0001),
 * so without a limit someone could script through the range.
 *
 * Two backends:
 *   - Upstash Redis (used automatically if UPSTASH_REDIS_REST_URL /
 *     UPSTASH_REDIS_REST_TOKEN are set) — required for serverless/Vercel,
 *     since each function invocation gets fresh memory.
 *   - In-memory Map fallback — fine for local dev or a single
 *     long-running Node process, but NOT reliable across multiple
 *     serverless instances (each cold start resets it).
 */

type RateLimitResult = { success: boolean; remaining: number; resetAt: number };

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10; // per key, per window

// ---- In-memory fallback ----
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return { success: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_SECONDS * 1000 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}

// ---- Upstash Redis backend (only initialized if env vars are present) ----
const upstashLimiter =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${WINDOW_SECONDS} s`),
        prefix: "gym-ratelimit",
      })
    : null;

/** Call at the top of a public route/page. `key` should identify the caller — see getClientIp(). */
export async function rateLimit(key: string): Promise<RateLimitResult> {
  if (upstashLimiter) {
    const res = await upstashLimiter.limit(key);
    return { success: res.success, remaining: res.remaining, resetAt: res.reset };
  }
  return memoryRateLimit(key);
}

/** Best-effort client IP extraction behind Vercel's proxy / most reverse proxies. */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
