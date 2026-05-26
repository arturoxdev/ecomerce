import "server-only";

import {
  getDrivingDistanceMiles,
  type DrivingDistanceResult,
  type LatLng,
} from "@/lib/google-maps";

import { findTiersByStore, getOrigin } from "../data";
import {
  selectTier,
  type DistanceTier,
} from "./distance-pricing.service";
import {
  readCachedMiles,
  writeCachedMiles,
  type CacheCoordinates,
} from "./quote-cache.service";

/**
 * Orchestrator — the ONLY entry point the cart and `placeOrder` use to price a
 * `DISTANCE_MILES` delivery. Composes origin + tiers + cache + Google:
 * cache hit → tier match; miss → Google → cache → tier match.
 */

export type QuoteResult =
  | {
      ok: true;
      miles: number;
      fee: number;
      tier: { id: string; minMiles: number; maxMiles: number };
    }
  | { ok: false; error: "OUT_OF_CAP"; miles: number; capMiles: number }
  | { ok: false; error: "UNAVAILABLE" };

export type QuoteDeliveryInput = {
  storeId: string;
  destLat: number;
  destLng: number;
};

export type QuoteServiceDeps = {
  loadOrigin: (storeId: string) => Promise<LatLng | null>;
  loadTiers: (storeId: string) => Promise<DistanceTier[]>;
  readCachedMiles: (coords: CacheCoordinates) => Promise<number | null>;
  writeCachedMiles: (coords: CacheCoordinates, miles: number) => Promise<void>;
  getDrivingDistanceMiles: (params: {
    origin: LatLng;
    destination: LatLng;
  }) => Promise<DrivingDistanceResult>;
  /** Coarse pre-filter for clearly-invalid coords; default = North America box. */
  isServiceable?: (lat: number, lng: number) => boolean;
};

// Generous default service box (North America). Its only job is to reject
// clearly-invalid destinations cheaply before spending a Google call; the real
// service area is defined by the tier table + cap. Override via env if needed.
const BOX = {
  minLat: Number(process.env.DELIVERY_BBOX_MIN_LAT ?? 14),
  maxLat: Number(process.env.DELIVERY_BBOX_MAX_LAT ?? 72),
  minLng: Number(process.env.DELIVERY_BBOX_MIN_LNG ?? -170),
  maxLng: Number(process.env.DELIVERY_BBOX_MAX_LNG ?? -52),
};

function defaultIsServiceable(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= BOX.minLat &&
    lat <= BOX.maxLat &&
    lng >= BOX.minLng &&
    lng <= BOX.maxLng
  );
}

export function createQuoteService(deps: QuoteServiceDeps) {
  const isServiceable = deps.isServiceable ?? defaultIsServiceable;

  async function quoteDelivery(input: QuoteDeliveryInput): Promise<QuoteResult> {
    const { storeId, destLat, destLng } = input;

    // Can't quote without pricing or an origin -> UNAVAILABLE (misconfigured).
    const tiers = await deps.loadTiers(storeId);
    if (tiers.length === 0) return { ok: false, error: "UNAVAILABLE" };

    const origin = await deps.loadOrigin(storeId);
    if (!origin) return { ok: false, error: "UNAVAILABLE" };

    const capMiles = Math.max(...tiers.map((t) => t.maxMiles));

    // Cheap out-of-area filter; no miles to report -> stand in with the cap.
    if (!isServiceable(destLat, destLng)) {
      return { ok: false, error: "OUT_OF_CAP", miles: capMiles, capMiles };
    }

    const coords: CacheCoordinates = {
      storeId,
      originLat: origin.lat,
      originLng: origin.lng,
      destLat,
      destLng,
    };

    let miles = await deps.readCachedMiles(coords);
    if (miles === null) {
      const distance = await deps.getDrivingDistanceMiles({
        origin,
        destination: { lat: destLat, lng: destLng },
      });
      if (!distance.ok) {
        if (distance.error === "ZERO_RESULTS") {
          // No road route -> out of service area. No real miles to show.
          return { ok: false, error: "OUT_OF_CAP", miles: capMiles, capMiles };
        }
        return { ok: false, error: "UNAVAILABLE" };
      }
      miles = distance.miles;
      await deps.writeCachedMiles(coords, miles);
    }

    const selection = selectTier({ miles, tiers });
    if (!selection.ok) {
      return {
        ok: false,
        error: "OUT_OF_CAP",
        miles,
        capMiles: selection.capMiles,
      };
    }

    return {
      ok: true,
      miles,
      fee: selection.tier.fee,
      tier: {
        id: selection.tier.id,
        minMiles: selection.tier.minMiles,
        maxMiles: selection.tier.maxMiles,
      },
    };
  }

  return { quoteDelivery };
}

export type QuoteService = ReturnType<typeof createQuoteService>;

// ── Default real-deps entry point ──────────────────────────────

const defaultService = createQuoteService({
  loadOrigin: async (storeId) => {
    const origin = await getOrigin(storeId);
    if (origin.lat === null || origin.lng === null) return null;
    return { lat: origin.lat, lng: origin.lng };
  },
  loadTiers: findTiersByStore,
  readCachedMiles,
  writeCachedMiles,
  getDrivingDistanceMiles: (params) => getDrivingDistanceMiles(params),
});

export const quoteDelivery = defaultService.quoteDelivery;
