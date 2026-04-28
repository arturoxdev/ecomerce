import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchAvailability,
  fetchUnavailableDates,
} from "./availability-client";

describe("fetchAvailability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successful response -> ok with clamped available and pricingModel", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ available: -5, pricingModel: "PER_UNIT" }),
    } as Response);

    const result = await fetchAvailability({
      productId: "product-1",
      date: "2026-06-01",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.available).toBe(0);
    expect(result.pricingModel).toBe("PER_UNIT");
    expect(spy).toHaveBeenCalledWith(
      "/api/availability?productId=product-1&date=2026-06-01",
    );
  });

  it("variantId provided -> included in query string", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ available: 2, pricingModel: "PER_UNIT" }),
    } as Response);

    await fetchAvailability({
      productId: "product-1",
      variantId: "variant-9",
      date: "2026-06-01",
    });

    expect(spy.mock.calls[0]?.[0]).toContain("variantId=variant-9");
  });

  it("non-ok response -> ok false", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);

    const result = await fetchAvailability({
      productId: "product-1",
      date: "2026-06-01",
    });

    expect(result.ok).toBe(false);
  });
});

describe("fetchUnavailableDates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successful response -> ok with unavailableDates", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        unavailableDates: ["2026-05-10", "2026-05-15"],
      }),
    } as Response);

    const result = await fetchUnavailableDates({
      productId: "product-1",
      month: "2026-05",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unavailableDates).toEqual(["2026-05-10", "2026-05-15"]);
    expect(spy).toHaveBeenCalledWith(
      "/api/availability/month?productId=product-1&month=2026-05",
    );
  });

  it("non-ok response -> ok false", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);

    const result = await fetchUnavailableDates({
      productId: "product-1",
      month: "2026-05",
    });

    expect(result.ok).toBe(false);
  });
});
