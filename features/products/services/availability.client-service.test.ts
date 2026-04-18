import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAvailability } from "./availability.client-service";

describe("fetchAvailability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successful response -> ok with clamped available and pricingModel", async () => {
    // Arrange
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ available: -5, pricingModel: "PER_UNIT" }),
    } as Response);

    // Act
    const result = await fetchAvailability({
      productId: "product-1",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
    });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.available).toBe(0);
    expect(result.pricingModel).toBe("PER_UNIT");
    expect(spy).toHaveBeenCalledWith(
      "/api/availability?productId=product-1&start=2026-06-01&end=2026-06-03",
    );
  });

  it("variantId provided -> included in query string", async () => {
    // Arrange
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ available: 2, pricingModel: "PER_UNIT" }),
    } as Response);

    // Act
    await fetchAvailability({
      productId: "product-1",
      variantId: "variant-9",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
    });

    // Assert
    expect(spy.mock.calls[0]?.[0]).toContain("variantId=variant-9");
  });

  it("non-ok response -> ok false", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);

    // Act
    const result = await fetchAvailability({
      productId: "product-1",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
    });

    // Assert
    expect(result.ok).toBe(false);
  });
});
