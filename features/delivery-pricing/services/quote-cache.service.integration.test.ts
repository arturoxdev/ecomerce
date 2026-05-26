import { describe, expect, it } from "vitest";

import { testDb } from "@/tests/integration/setup";

import { createQuoteCacheService } from "./quote-cache.service";

const STORE_ID = "integration-quote-cache-store";

const COORDS = {
  storeId: STORE_ID,
  originLat: 32.7801234,
  originLng: -96.8005678,
  destLat: 32.8501234,
  destLng: -96.8505678,
};

describe("quote-cache.service (real DB)", () => {
  it("write then read round-trips the miles", async () => {
    // Arrange
    const service = createQuoteCacheService({ db: testDb });

    // Act
    await service.writeCachedMiles(COORDS, 7.2);
    const miles = await service.readCachedMiles(COORDS);

    // Assert
    expect(miles).toBe(7.2);
  });

  it("matches on coordinates that round to the same 4 decimals", async () => {
    // Arrange
    const service = createQuoteCacheService({ db: testDb });
    await service.writeCachedMiles(COORDS, 5.5);

    // Act: nudge each coord by < 0.00005 so rounding to 4dp is unchanged
    const miles = await service.readCachedMiles({
      ...COORDS,
      destLat: COORDS.destLat + 0.00002,
      destLng: COORDS.destLng - 0.00003,
    });

    // Assert
    expect(miles).toBe(5.5);
  });

  it("upsert on the rounded tuple keeps a single row and refreshes miles", async () => {
    // Arrange
    const service = createQuoteCacheService({ db: testDb });

    // Act
    await service.writeCachedMiles(COORDS, 5.5);
    await service.writeCachedMiles(COORDS, 9.9);

    // Assert
    const miles = await service.readCachedMiles(COORDS);
    expect(miles).toBe(9.9);
  });

  it("evicts entries older than the 30-day TTL on read", async () => {
    // Arrange: write with a clock 31 days in the past
    const past = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const staleService = createQuoteCacheService({
      db: testDb,
      now: () => past,
    });
    await staleService.writeCachedMiles(COORDS, 4.4);

    // Act: read with the real clock
    const freshService = createQuoteCacheService({ db: testDb });
    const miles = await freshService.readCachedMiles(COORDS);

    // Assert
    expect(miles).toBeNull();
  });

  it("returns null when nothing is cached", async () => {
    // Arrange
    const service = createQuoteCacheService({ db: testDb });

    // Act
    const miles = await service.readCachedMiles({
      ...COORDS,
      destLat: 10,
      destLng: -50,
    });

    // Assert
    expect(miles).toBeNull();
  });
});
