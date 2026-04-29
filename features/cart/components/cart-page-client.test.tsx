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
      date: string;
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
  isCartItemPastDue: () => false,
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
    splitBadge: "50% now · 50% on delivery",
    splitNotice: "50% online, 50% on delivery",
    payNow: "Pay now (50%)",
    balanceOnDelivery: "Balance on delivery (50%)",
    pastDateBadge: "Past date",
    pastDateBlocking: "Some items have a past date.",
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
        date: "2099-05-10",
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
    it("valid checkout -> submits order payload, clears cart, and redirects to Stripe", async () => {
      // Arrange
      const user = userEvent.setup();
      mocks.placeOrder.mockResolvedValue({
        success: true,
        orderId: "order-123",
        checkoutUrl: "https://checkout.stripe.test/session_123",
      });
      const assignMock = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { assign: assignMock },
      });
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
          selectedCity: null,
          selectedZipCode: null,
          locale: "en",
          items: [
            {
              productId: "product-1",
              variantId: null,
              quantity: 2,
              unitPrice: 30,
              date: "2099-05-10",
            },
          ],
        });
      });
      await waitFor(() => {
        expect(mocks.clearCart).toHaveBeenCalledTimes(1);
      });
      expect(assignMock).toHaveBeenCalledWith(
        "https://checkout.stripe.test/session_123",
      );
      expect(mocks.toastError).not.toHaveBeenCalled();

      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });

    it("missing checkoutUrl -> does not clear cart nor redirect", async () => {
      // Arrange
      const user = userEvent.setup();
      mocks.placeOrder.mockResolvedValue({
        success: true,
        orderId: "order-123",
      });
      const assignMock = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { assign: assignMock },
      });
      render(<CartPageClient locale="en" labels={labels} />);

      // Act
      await user.type(screen.getByLabelText("Name"), "Jane Doe");
      await user.type(screen.getByLabelText("Email"), "jane@example.com");
      await user.type(screen.getByLabelText("Phone"), "555-1111");
      await user.click(screen.getByRole("button", { name: "Confirm order" }));

      // Assert
      await waitFor(() => {
        expect(mocks.toastError).toHaveBeenCalledWith("No checkout URL returned");
      });
      expect(mocks.clearCart).not.toHaveBeenCalled();
      expect(assignMock).not.toHaveBeenCalled();

      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });
  });
});
