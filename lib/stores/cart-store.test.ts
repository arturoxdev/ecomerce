import { beforeEach, describe, expect, it } from "vitest";

import {
  getCartSubtotal,
  getItemCount,
  useCartStore,
  type CartItem,
} from "./cart-store";

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
    date: "2099-05-01",
    stock: 10,
    selectedServices: [],
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

describe("cart-store addItem", () => {
  function newLine(partial: Partial<CartItem> = {}) {
    const item: Partial<CartItem> = buildItem(partial);
    delete item.id;
    return item as Omit<CartItem, "id">;
  }

  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it("same product, date, variant and services -> sums quantity on one line", () => {
    useCartStore.getState().addItem(newLine({ quantity: 2 }));
    useCartStore.getState().addItem(newLine({ quantity: 3 }));

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(5);
  });

  it("summed quantity -> capped at the line's stock", () => {
    useCartStore.getState().addItem(newLine({ quantity: 4, stock: 5 }));
    useCartStore.getState().addItem(newLine({ quantity: 4, stock: 5 }));

    expect(useCartStore.getState().items[0]!.quantity).toBe(5);
  });

  it("different date -> separate line", () => {
    useCartStore.getState().addItem(newLine({ date: "2099-05-01" }));
    useCartStore.getState().addItem(newLine({ date: "2099-05-02" }));

    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("different variant -> separate line", () => {
    useCartStore.getState().addItem(newLine({ variantId: null }));
    useCartStore.getState().addItem(newLine({ variantId: "variant-1" }));

    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it("different services -> separate line", () => {
    useCartStore.getState().addItem(newLine({ selectedServices: [] }));
    useCartStore.getState().addItem(
      newLine({
        selectedServices: [{ id: "svc-1", name: "Setup", price: 20 }],
      }),
    );

    expect(useCartStore.getState().items).toHaveLength(2);
  });
});
