import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/db";

import {
  handleAvailabilityRequest,
  type AvailabilityHandlerDeps,
} from "./availability.handler";

const VALID_PRODUCT = "11111111-1111-1111-1111-111111111111";
const VALID_VARIANT = "22222222-2222-2222-2222-222222222222";

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function buildDeps(
  overrides: Partial<AvailabilityHandlerDeps> = {},
): AvailabilityHandlerDeps {
  return {
    db: {
      execute: async () => ({ rows: [{ occupied: 0 }] }),
    } as unknown as Database,
    findProductById: vi.fn(async () => ({
      id: VALID_PRODUCT,
      stock: 5,
      isActive: true,
      priceType: "PER_UNIT" as const,
    })),
    findVariantById: vi.fn(async () => ({
      id: VALID_VARIANT,
      productId: VALID_PRODUCT,
      isActive: true,
      stock: 10,
    })),
    ...overrides,
  };
}

describe("handleAvailabilityRequest", () => {
  describe("🚫 Validation", () => {
    it("missing productId -> 400 bad request", async () => {
      const res = await handleAvailabilityRequest(
        { productId: null, variantId: null, date: futureDate(5) },
        buildDeps(),
      );

      expect(res.status).toBe(400);
    });

    it("productId not UUID -> 400 bad request", async () => {
      const res = await handleAvailabilityRequest(
        { productId: "nope", variantId: null, date: futureDate(5) },
        buildDeps(),
      );

      expect(res.status).toBe(400);
    });

    it("date in the past -> 400 bad request", async () => {
      const res = await handleAvailabilityRequest(
        {
          productId: VALID_PRODUCT,
          variantId: null,
          date: futureDate(-1),
        },
        buildDeps(),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.detail).toContain("tomorrow");
    });

    it("date is today -> 400 bad request", async () => {
      const res = await handleAvailabilityRequest(
        {
          productId: VALID_PRODUCT,
          variantId: null,
          date: futureDate(0),
        },
        buildDeps(),
      );

      expect(res.status).toBe(400);
    });
  });

  describe("❌ Not found", () => {
    it("product missing -> 404", async () => {
      const deps = buildDeps({ findProductById: vi.fn(async () => null) });

      const res = await handleAvailabilityRequest(
        {
          productId: VALID_PRODUCT,
          variantId: null,
          date: futureDate(5),
        },
        deps,
      );

      expect(res.status).toBe(404);
    });

    it("variant belongs to different product -> 404", async () => {
      const deps = buildDeps({
        findVariantById: vi.fn(async () => ({
          id: VALID_VARIANT,
          productId: "99999999-9999-9999-9999-999999999999",
          isActive: true,
          stock: 10,
        })),
      });

      const res = await handleAvailabilityRequest(
        {
          productId: VALID_PRODUCT,
          variantId: VALID_VARIANT,
          date: futureDate(5),
        },
        deps,
      );

      expect(res.status).toBe(404);
    });
  });

  describe("✅ Happy path", () => {
    it("valid request with no occupied -> 200 with available=stock", async () => {
      const deps = buildDeps({
        db: {
          execute: async () => ({ rows: [{ occupied: 0 }] }),
        } as unknown as Database,
      });

      const res = await handleAvailabilityRequest(
        {
          productId: VALID_PRODUCT,
          variantId: null,
          date: futureDate(5),
        },
        deps,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ available: 5, pricingModel: "PER_UNIT" });
    });

    it("variant present -> uses variant stock for calculation", async () => {
      const deps = buildDeps({
        db: {
          execute: async () => ({ rows: [{ occupied: 0 }] }),
        } as unknown as Database,
      });

      const res = await handleAvailabilityRequest(
        {
          productId: VALID_PRODUCT,
          variantId: VALID_VARIANT,
          date: futureDate(5),
        },
        deps,
      );

      const body = await res.json();
      expect(body.available).toBe(10);
    });
  });
});
