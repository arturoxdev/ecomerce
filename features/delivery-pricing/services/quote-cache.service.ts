import "server-only";

import { and, eq, gte } from "drizzle-orm";

import { db, type Database } from "@/lib/db";
import { deliveryDistanceCache } from "@/lib/db/schema";

/**
 * Read/write of `delivery_distance_cache`. Caches ONLY the road miles for an
 * (origin, destination) pair, keyed by lat/lng rounded to 4 decimals (~11 m),
 * TTL 30 days. The fee is never cached — it is re-derived from the current tier
 * table on every quote, so admin tier edits take effect immediately.
 */

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Rounds to 4 decimals, matching the cache key precision (numeric(7,4)). */
export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function key4(value: number): string {
  return round4(value).toFixed(4);
}

export type CacheCoordinates = {
  storeId: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
};

export type QuoteCacheServiceDeps = {
  db: Database;
  now?: () => Date;
};

export function createQuoteCacheService(deps: QuoteCacheServiceDeps) {
  const now = deps.now ?? (() => new Date());

  /** Returns cached miles when a fresh (< TTL) row exists, else null. */
  async function readCachedMiles(
    coords: CacheCoordinates,
  ): Promise<number | null> {
    const freshThreshold = new Date(now().getTime() - CACHE_TTL_MS);
    const row = await deps.db.query.deliveryDistanceCache.findFirst({
      where: and(
        eq(deliveryDistanceCache.storeId, coords.storeId),
        eq(deliveryDistanceCache.originLatRounded, key4(coords.originLat)),
        eq(deliveryDistanceCache.originLngRounded, key4(coords.originLng)),
        eq(deliveryDistanceCache.destLatRounded, key4(coords.destLat)),
        eq(deliveryDistanceCache.destLngRounded, key4(coords.destLng)),
        gte(deliveryDistanceCache.computedAt, freshThreshold),
      ),
    });
    return row ? Number.parseFloat(row.miles) : null;
  }

  /** Upserts the miles for the rounded coordinate tuple, refreshing the TTL. */
  async function writeCachedMiles(
    coords: CacheCoordinates,
    miles: number,
  ): Promise<void> {
    const computedAt = now();
    await deps.db
      .insert(deliveryDistanceCache)
      .values({
        storeId: coords.storeId,
        originLatRounded: key4(coords.originLat),
        originLngRounded: key4(coords.originLng),
        destLatRounded: key4(coords.destLat),
        destLngRounded: key4(coords.destLng),
        miles: miles.toFixed(2),
        computedAt,
      })
      .onConflictDoUpdate({
        target: [
          deliveryDistanceCache.storeId,
          deliveryDistanceCache.originLatRounded,
          deliveryDistanceCache.originLngRounded,
          deliveryDistanceCache.destLatRounded,
          deliveryDistanceCache.destLngRounded,
        ],
        set: { miles: miles.toFixed(2), computedAt },
      });
  }

  return { readCachedMiles, writeCachedMiles };
}

export type QuoteCacheService = ReturnType<typeof createQuoteCacheService>;

const defaultService = createQuoteCacheService({ db });

export const readCachedMiles = defaultService.readCachedMiles;
export const writeCachedMiles = defaultService.writeCachedMiles;
