import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  // Disabled outside production to ease local testing.
  if (process.env.NODE_ENV !== "production") {
    return {
      allowed: true,
      remaining: max,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const result = await db.execute<{ count: number; window_start: Date }>(sql`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < ${windowStart} THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < ${windowStart} THEN ${now}
        ELSE rate_limits.window_start
      END
    RETURNING count, window_start
  `);

  const row = result.rows[0];
  const count = Number(row?.count ?? 0);
  const rowStart = row?.window_start ? new Date(row.window_start) : now;

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt: new Date(rowStart.getTime() + windowSeconds * 1000),
  };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.replace(/[^a-fA-F0-9.:]/g, "").slice(0, 64);
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim().replace(/[^a-fA-F0-9.:]/g, "").slice(0, 64);
  return "unknown";
}
