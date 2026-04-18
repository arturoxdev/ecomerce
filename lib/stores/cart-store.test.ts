import { describe, expect, it } from "vitest";

import { getCartSubtotal, getItemCount, type CartItem } from "./cart-store";

function buildItem(partial: Partial<CartItem> = {}): CartItem {
  return {
    id: "item-1",
    productId: "product-1",
    productName: "Product",
    productSlug: "product",
    productPhoto: null,
    variantId: null,
    variantName: null,
    quantity: 1,
    unitPrice: 0,
    priceType: "PER_UNIT",
    startDate: "2026-05-01",
    endDate: "2026-05-02",
    stock: 10,
    ...partial,
  };
}

describe("cart-store pure selectors", () => {
  describe("getCartSubtotal", () => {
    it("empty cart -> 0", () => {
      expect(getCartSubtotal([])).toBe(0);
    });

    it("multiple items -> sum of unitPrice * quantity", () => {
      // Arrange
      const items: CartItem[] = [
        buildItem({ id: "a", unitPrice: 30, quantity: 2 }),
        buildItem({ id: "b", unitPrice: 10.5, quantity: 3 }),
      ];

      // Act
      const result = getCartSubtotal(items);

      // Assert
      expect(result).toBe(30 * 2 + 10.5 * 3);
    });
  });

  describe("getItemCount", () => {
    it("empty cart -> 0", () => {
      expect(getItemCount([])).toBe(0);
    });

    it("items with varying quantities -> total quantity", () => {
      // Arrange
      const items: CartItem[] = [
        buildItem({ id: "a", quantity: 1 }),
        buildItem({ id: "b", quantity: 4 }),
        buildItem({ id: "c", quantity: 2 }),
      ];

      // Act
      const result = getItemCount(items);

      // Assert
      expect(result).toBe(7);
    });
  });
});
