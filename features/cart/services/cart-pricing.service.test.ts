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

    it("paid delivery with 20 fee and 15% deposit -> total includes delivery", () => {
      // Arrange
      const input = {
        subtotal: 100,
        settings: {
          deliveryMode: "CUSTOM",
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
  });
});
