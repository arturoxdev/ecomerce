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
        date: new Date("2026-04-20T00:00:00.000Z"),
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
        date: new Date("2026-04-20T00:00:00.000Z"),
        quantity: 2,
        stock: 4,
      });

      // Assert
      expect(result.occupied).toBe(3);
      expect(result.isAvailable).toBe(false);
    });

    it("stock 5 -> the 5th unit of the day is accepted, the 6th rejected", async () => {
      const base = {
        productId: "11111111-1111-1111-1111-111111111111",
        date: new Date("2026-04-20T00:00:00.000Z"),
        quantity: 1,
        stock: 5,
      };

      const fifth = await checkAvailability(
        { execute: async () => ({ rows: [{ occupied: 4 }] }) },
        base,
      );
      const sixth = await checkAvailability(
        { execute: async () => ({ rows: [{ occupied: 5 }] }) },
        base,
      );

      expect(fifth.isAvailable).toBe(true);
      expect(sixth.isAvailable).toBe(false);
    });
  });

  describe("available quantity calculation", () => {
    it("one booking against stock 99 -> the other 98 stay available", () => {
      // Arrange
      const input = {
        occupied: 1,
        stock: 99,
      };

      // Act
      const result = calculateAvailableQuantity(input);

      // Assert
      expect(result).toBe(98);
    });

    it("occupied equals stock -> returns 0", () => {
      expect(calculateAvailableQuantity({ occupied: 5, stock: 5 })).toBe(0);
    });

    it("zero stock -> returns 0", () => {
      expect(calculateAvailableQuantity({ occupied: 0, stock: 0 })).toBe(0);
    });

    it("stock 10 and occupied 4 -> returns 6", () => {
      // Arrange
      const input = {
        occupied: 4,
        stock: 10,
      };

      // Act
      const result = calculateAvailableQuantity(input);

      // Assert
      expect(result).toBe(6);
    });
  });
});
