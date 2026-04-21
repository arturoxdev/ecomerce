import { describe, expect, it } from "vitest";

import {
  calculateAvailableQuantity,
  checkAvailability,
  findOccupiedQuantity,
} from "@/lib/services/availability.service";

describe("availability service", () => {
  describe("occupied quantity", () => {
    it("variant window with 2 occupied units -> returns 2", async () => {
      // Arrange
      const executor = {
        execute: async () => ({ rows: [{ occupied: 2 }] }),
      };

      // Act
      const result = await findOccupiedQuantity(executor, {
        productId: "11111111-1111-1111-1111-111111111111",
        variantId: "22222222-2222-2222-2222-222222222222",
        startDate: new Date("2026-04-20T00:00:00.000Z"),
        endDate: new Date("2026-04-22T00:00:00.000Z"),
      });

      // Assert
      expect(result).toBe(2);
    });
  });

  describe("availability checks", () => {
    it("occupied 3 with stock 4 and quantity 2 -> unavailable", async () => {
      // Arrange
      const executor = {
        execute: async () => ({ rows: [{ occupied: 3 }] }),
      };

      // Act
      const result = await checkAvailability(executor, {
        productId: "11111111-1111-1111-1111-111111111111",
        startDate: new Date("2026-04-20T00:00:00.000Z"),
        endDate: new Date("2026-04-22T00:00:00.000Z"),
        quantity: 2,
        stock: 4,
      });

      // Assert
      expect(result.occupied).toBe(3);
      expect(result.isAvailable).toBe(false);
    });
  });

  describe("available quantity calculation", () => {
    it("FIXED with occupied slot -> returns 0", () => {
      // Arrange
      const input = {
        occupied: 1,
        stock: 99,
        priceType: "FIXED" as const,
      };

      // Act
      const result = calculateAvailableQuantity(input);

      // Assert
      expect(result).toBe(0);
    });

    it("PER_UNIT with stock 10 and occupied 4 -> returns 6", () => {
      // Arrange
      const input = {
        occupied: 4,
        stock: 10,
        priceType: "PER_UNIT" as const,
      };

      // Act
      const result = calculateAvailableQuantity(input);

      // Assert
      expect(result).toBe(6);
    });
  });
});
