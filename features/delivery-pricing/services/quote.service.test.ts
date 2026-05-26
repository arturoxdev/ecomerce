import { describe, expect, it, vi } from "vitest";

import { createQuoteService, type QuoteServiceDeps } from "./quote.service";
import type { DistanceTier } from "./distance-pricing.service";

const TIERS: DistanceTier[] = [
  { id: "t1", minMiles: 0, maxMiles: 5, fee: 20 },
  { id: "t2", minMiles: 5, maxMiles: 10, fee: 35 },
  { id: "t3", minMiles: 10, maxMiles: 15, fee: 50 },
];

const ORIGIN = { lat: 32.78, lng: -96.8 };
const DEST = { lat: 32.85, lng: -96.85 };

function makeDeps(overrides: Partial<QuoteServiceDeps> = {}): {
  deps: QuoteServiceDeps;
  spies: {
    readCachedMiles: ReturnType<typeof vi.fn>;
    writeCachedMiles: ReturnType<typeof vi.fn>;
    getDrivingDistanceMiles: ReturnType<typeof vi.fn>;
  };
} {
  const readCachedMiles = vi.fn().mockResolvedValue(null);
  const writeCachedMiles = vi.fn().mockResolvedValue(undefined);
  const getDrivingDistanceMiles = vi
    .fn()
    .mockResolvedValue({ ok: true, miles: 7.2 });

  const deps: QuoteServiceDeps = {
    loadOrigin: vi.fn().mockResolvedValue(ORIGIN),
    loadTiers: vi.fn().mockResolvedValue(TIERS),
    readCachedMiles,
    writeCachedMiles,
    getDrivingDistanceMiles,
    ...overrides,
  };

  return {
    deps,
    spies: { readCachedMiles, writeCachedMiles, getDrivingDistanceMiles },
  };
}

const QUERY = { storeId: "store", destLat: DEST.lat, destLng: DEST.lng };

describe("quoteDelivery", () => {
  it("cache hit -> skips Google and matches tier", async () => {
    // Arrange
    const { deps, spies } = makeDeps({
      readCachedMiles: vi.fn().mockResolvedValue(7.2),
    });
    const service = createQuoteService(deps);

    // Act
    const result = await service.quoteDelivery(QUERY);

    // Assert
    expect(result).toEqual({
      ok: true,
      miles: 7.2,
      fee: 35,
      tier: { id: "t2", minMiles: 5, maxMiles: 10 },
    });
    expect(spies.getDrivingDistanceMiles).not.toHaveBeenCalled();
    expect(spies.writeCachedMiles).not.toHaveBeenCalled();
  });

  it("cache miss -> calls Google, writes cache, matches tier", async () => {
    // Arrange
    const { deps, spies } = makeDeps();
    const service = createQuoteService(deps);

    // Act
    const result = await service.quoteDelivery(QUERY);

    // Assert
    expect(result).toEqual({
      ok: true,
      miles: 7.2,
      fee: 35,
      tier: { id: "t2", minMiles: 5, maxMiles: 10 },
    });
    expect(spies.getDrivingDistanceMiles).toHaveBeenCalledTimes(1);
    expect(spies.writeCachedMiles).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store" }),
      7.2,
    );
  });

  it("Google ZERO_RESULTS -> OUT_OF_CAP with cap", async () => {
    // Arrange
    const { deps, spies } = makeDeps({
      getDrivingDistanceMiles: vi
        .fn()
        .mockResolvedValue({ ok: false, error: "ZERO_RESULTS" }),
    });
    const service = createQuoteService(deps);

    // Act
    const result = await service.quoteDelivery(QUERY);

    // Assert
    expect(result).toEqual({
      ok: false,
      error: "OUT_OF_CAP",
      miles: 15,
      capMiles: 15,
    });
    expect(spies.writeCachedMiles).not.toHaveBeenCalled();
  });

  it("Google UNAVAILABLE -> UNAVAILABLE", async () => {
    // Arrange
    const { deps } = makeDeps({
      getDrivingDistanceMiles: vi
        .fn()
        .mockResolvedValue({ ok: false, error: "UNAVAILABLE" }),
    });
    const service = createQuoteService(deps);

    // Act
    const result = await service.quoteDelivery(QUERY);

    // Assert
    expect(result).toEqual({ ok: false, error: "UNAVAILABLE" });
  });

  it("miles beyond cap -> OUT_OF_CAP with real miles", async () => {
    // Arrange
    const { deps } = makeDeps({
      getDrivingDistanceMiles: vi
        .fn()
        .mockResolvedValue({ ok: true, miles: 18.4 }),
    });
    const service = createQuoteService(deps);

    // Act
    const result = await service.quoteDelivery(QUERY);

    // Assert
    expect(result).toEqual({
      ok: false,
      error: "OUT_OF_CAP",
      miles: 18.4,
      capMiles: 15,
    });
  });

  it("empty tier table -> UNAVAILABLE (cannot quote without pricing)", async () => {
    // Arrange
    const { deps, spies } = makeDeps({
      loadTiers: vi.fn().mockResolvedValue([]),
    });
    const service = createQuoteService(deps);

    // Act
    const result = await service.quoteDelivery(QUERY);

    // Assert
    expect(result).toEqual({ ok: false, error: "UNAVAILABLE" });
    expect(spies.getDrivingDistanceMiles).not.toHaveBeenCalled();
  });

  it("missing origin -> UNAVAILABLE", async () => {
    // Arrange
    const { deps } = makeDeps({
      loadOrigin: vi.fn().mockResolvedValue(null),
    });
    const service = createQuoteService(deps);

    // Act
    const result = await service.quoteDelivery(QUERY);

    // Assert
    expect(result).toEqual({ ok: false, error: "UNAVAILABLE" });
  });

  it("destination outside service box -> OUT_OF_CAP without Google call", async () => {
    // Arrange: a clearly out-of-box destination
    const { deps, spies } = makeDeps();
    const service = createQuoteService(deps);

    // Act
    const result = await service.quoteDelivery({
      storeId: "store",
      destLat: -33.8,
      destLng: 151.2,
    });

    // Assert
    expect(result).toEqual({
      ok: false,
      error: "OUT_OF_CAP",
      miles: 15,
      capMiles: 15,
    });
    expect(spies.getDrivingDistanceMiles).not.toHaveBeenCalled();
  });
});
