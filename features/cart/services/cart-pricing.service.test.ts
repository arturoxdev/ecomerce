import { describe, expect, it } from "vitest";

import { calculateCartSummary } from "./cart-pricing.service";

describe("cart pricing service", () => {
  describe("cart summary", () => {
    it("included delivery with 10% deposit -> delivery 0 and total equals subtotal", () => {
      // Arrange
      const input = {
        subtotal: 250,
        settings: {
          deliveryMode: "INCLUDED",
          deliveryFee: 30,
          depositPercent: 0.1,
          paymentMode: "SPLIT_50_50" as const,
          currency: "USD",
        },
      };

      // Act
      const result = calculateCartSummary(input);

      // Assert
      expect(result.deliveryFee).toBe(0);
      expect(result.deposit).toBe(25);
      expect(result.total).toBe(250);
    });

    it("FIXED_FEE delivery with 20 fee and 15% deposit -> total includes delivery", () => {
      // Arrange
      const input = {
        subtotal: 100,
        settings: {
          deliveryMode: "FIXED_FEE",
          deliveryFee: 20,
          depositPercent: 0.15,
          paymentMode: "SPLIT_50_50" as const,
          currency: "USD",
        },
      };

      // Act
      const result = calculateCartSummary(input);

      // Assert
      expect(result.deliveryFee).toBe(20);
      expect(result.deposit).toBe(15);
      expect(result.total).toBe(120);
    });

    it("ZIP_CODE without resolvedZipFee -> delivery 0 (no selection yet)", () => {
      // Arrange
      const input = {
        subtotal: 100,
        settings: {
          deliveryMode: "ZIP_CODE",
          deliveryFee: 0,
          depositPercent: 0.1,
          paymentMode: "SPLIT_50_50" as const,
          currency: "USD",
        },
      };

      // Act
      const result = calculateCartSummary(input);

      // Assert
      expect(result.deliveryFee).toBe(0);
      expect(result.total).toBe(100);
    });

    it("ZIP_CODE with resolvedZipFee 75 -> total includes the resolved fee", () => {
      // Arrange
      const input = {
        subtotal: 100,
        settings: {
          deliveryMode: "ZIP_CODE",
          deliveryFee: 0,
          depositPercent: 0.1,
          paymentMode: "SPLIT_50_50" as const,
          currency: "USD",
        },
        resolvedZipFee: 75,
      };

      // Act
      const result = calculateCartSummary(input);

      // Assert
      expect(result.deliveryFee).toBe(75);
      expect(result.total).toBe(175);
    });

    it("DISTANCE_MILES without resolvedDistanceFee -> delivery 0 (not quoted yet)", () => {
      // Arrange
      const input = {
        subtotal: 100,
        settings: {
          deliveryMode: "DISTANCE_MILES",
          deliveryFee: 0,
          depositPercent: 0.1,
          paymentMode: "SPLIT_50_50" as const,
          currency: "USD",
        },
      };

      // Act
      const result = calculateCartSummary(input);

      // Assert
      expect(result.deliveryFee).toBe(0);
      expect(result.total).toBe(100);
    });

    it("DISTANCE_MILES with resolvedDistanceFee 35 -> total includes the resolved fee", () => {
      // Arrange
      const input = {
        subtotal: 100,
        settings: {
          deliveryMode: "DISTANCE_MILES",
          deliveryFee: 0,
          depositPercent: 0.1,
          paymentMode: "SPLIT_50_50" as const,
          currency: "USD",
        },
        resolvedDistanceFee: 35,
      };

      // Act
      const result = calculateCartSummary(input);

      // Assert
      expect(result.deliveryFee).toBe(35);
      expect(result.total).toBe(135);
    });
  });
});
