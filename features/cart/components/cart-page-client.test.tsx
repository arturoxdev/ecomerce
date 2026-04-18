import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const push = vi.fn();
  const toastError = vi.fn();
  const getStoreSettings = vi.fn();
  const placeOrder = vi.fn();
  const removeItem = vi.fn();
  const updateQuantity = vi.fn();
  const clearCart = vi.fn();

  const cartState = {
    items: [] as Array<{
      id: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPrice: number;
      startDate: string;
      endDate: string;
    }>,
    removeItem,
    updateQuantity,
    clearCart,
  };

  const useCartStore = ((selector: (state: typeof cartState) => unknown) =>
    selector(cartState)) as {
    (selector: (state: typeof cartState) => unknown): unknown;
    persist: {
      hasHydrated: () => boolean;
      onFinishHydration: () => () => void;
    };
  };

  useCartStore.persist = {
    hasHydrated: () => true,
    onFinishHydration: () => () => {},
  };

  return {
    push,
    toastError,
    getStoreSettings,
    placeOrder,
    removeItem,
    updateQuantity,
    clearCart,
    cartState,
    useCartStore,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

vi.mock("@/app/[locale]/cart/actions", () => ({
  getStoreSettings: (...args: unknown[]) => mocks.getStoreSettings(...args),
  placeOrder: (...args: unknown[]) => mocks.placeOrder(...args),
}));

vi.mock("@/lib/stores/cart-store", () => ({
  useCartStore: mocks.useCartStore,
  getCartSubtotal: (items: Array<{ quantity: number; unitPrice: number }>) =>
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
}));

vi.mock("./cart-item", () => ({
  CartItem: ({ item }: { item: { productId: string } }) => <div>{item.productId}</div>,
}));

import { CartPageClient } from "./cart-page-client";

describe("CartPageClient", () => {
  afterEach(() => {
    cleanup();
  });

  const labels = {
    title: "Your cart",
    empty: "Empty",
    emptyDescription: "No items",
    browseCatalog: "Browse",
    quantity: "Quantity",
    remove: "Remove",
    summary: "Summary",
    subtotal: "Subtotal",
    deliveryFee: "Delivery",
    deposit: "Deposit",
    total: "Total",
    included: "Included",
    customerInfo: "Customer info",
    name: "Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    addressPlaceholder: "Street and number",
    confirmOrder: "Confirm order",
    processing: "Processing",
    itemUnavailable: "Unavailable item",
  };

  beforeEach(() => {
    cleanup();
    mocks.push.mockReset();
    mocks.toastError.mockReset();
    mocks.getStoreSettings.mockReset();
    mocks.placeOrder.mockReset();
    mocks.removeItem.mockReset();
    mocks.updateQuantity.mockReset();
    mocks.clearCart.mockReset();

    mocks.cartState.items = [
      {
        id: "item-1",
        productId: "product-1",
        variantId: null,
        quantity: 2,
        unitPrice: 30,
        startDate: "2026-05-10",
        endDate: "2026-05-12",
      },
    ];

    mocks.getStoreSettings.mockResolvedValue({
      deliveryMode: "INCLUDED",
      deliveryFee: 0,
      depositPercent: 0.1,
    });
  });

  describe("🚫 Validations", () => {
    it("missing customer fields -> shows validation errors and skips submit", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<CartPageClient locale="en" labels={labels} />);

      // Act
      await user.click(screen.getByRole("button", { name: "Confirm order" }));

      // Assert
      expect(screen.getAllByText("Required")).toHaveLength(2);
      expect(screen.getByText("Valid email required")).toBeInTheDocument();
      expect(mocks.placeOrder).not.toHaveBeenCalled();
    });
  });

  describe("✅ Happy path", () => {
    it("valid checkout -> submits order payload and redirects to confirmation page", async () => {
      // Arrange
      const user = userEvent.setup();
      mocks.placeOrder.mockResolvedValue({ success: true, orderId: "order-123" });
      render(<CartPageClient locale="en" labels={labels} />);

      // Act
      await user.type(screen.getByLabelText("Name"), "Jane Doe");
      await user.type(screen.getByLabelText("Email"), "jane@example.com");
      await user.type(screen.getByLabelText("Phone"), "555-1111");
      await user.type(screen.getByLabelText("Address"), "Main Street 10");
      await user.click(screen.getByRole("button", { name: "Confirm order" }));

      // Assert
      await waitFor(() => {
        expect(mocks.placeOrder).toHaveBeenCalledWith({
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          customerPhone: "555-1111",
          deliveryAddress: "Main Street 10",
          items: [
            {
              productId: "product-1",
              variantId: null,
              quantity: 2,
              unitPrice: 30,
              startDate: "2026-05-10",
              endDate: "2026-05-12",
            },
          ],
        });
      });
      expect(mocks.clearCart).toHaveBeenCalledTimes(1);
      expect(mocks.push).toHaveBeenCalledWith("/en/order/order-123");
    });
  });
});
