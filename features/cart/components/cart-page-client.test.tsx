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
      selectedServices: Array<{ id: string; name: string; price: number }>;
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

vi.mock("@/components/maps/place-autocomplete", () => ({
  PlaceAutocomplete: ({
    value,
    onValueChange,
    onPlaceSelected,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    onPlaceSelected: (p: {
      formattedAddress: string;
      lat: number;
      lng: number;
    }) => void;
  }) => (
    <div>
      <input
        aria-label="Delivery address"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() =>
          onPlaceSelected({
            formattedAddress: "123 Main St, Dallas, TX",
            lat: 32.78,
            lng: -96.8,
          })
        }
      >
        stub-select-place
      </button>
    </div>
  ),
}));

import { CartPageClient } from "./cart-page-client";

describe("CartPageClient", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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
    servicesFee: "Additional Services",
    deposit: "Deposit",
    total: "Total",
    included: "Included",
    servicesSectionTitle: "Additional Services",
    servicesOptionalAddOns: "Optional add-ons",
    servicesNone: "No additional services available",
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
        selectedServices: [],
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
      render(<CartPageClient locale="en" globalServices={[]} labels={labels} />);

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
      render(<CartPageClient locale="en" globalServices={[]} labels={labels} />);

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
          destLat: null,
          destLng: null,
          formattedAddress: null,
          locale: "en",
          globalServiceIds: [],
          items: [
            {
              productId: "product-1",
              variantId: null,
              quantity: 2,
              unitPrice: 30,
              date: "2099-05-10",
              localServiceIds: [],
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
      render(<CartPageClient locale="en" globalServices={[]} labels={labels} />);

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

  describe("🕐 Event Window", () => {
    it("window NOT configured (null start/end) -> hour selector is NOT rendered", async () => {
      // Arrange
      mocks.getStoreSettings.mockResolvedValue({
        deliveryMode: "INCLUDED",
        deliveryFee: 0,
        depositPercent: 0.1,
        paymentMode: "SPLIT_50_50",
        currency: "USD",
        eventWindowStart: null,
        eventWindowEnd: null,
      });
      const eventLabels = {
        ...labels,
        eventStartTimeLabel: "Hora de inicio de tu evento",
      };

      // Act
      render(
        <CartPageClient locale="en" globalServices={[]} labels={eventLabels} />,
      );

      // Assert — wait for settings to resolve, then confirm selector is absent
      await waitFor(() => {
        expect(
          screen.queryByText("Hora de inicio de tu evento"),
        ).not.toBeInTheDocument();
      });
    });

    it("window configured (09:00–12:00) -> hour selector IS rendered", async () => {
      // Arrange
      mocks.getStoreSettings.mockResolvedValue({
        deliveryMode: "INCLUDED",
        deliveryFee: 0,
        depositPercent: 0.1,
        paymentMode: "SPLIT_50_50",
        currency: "USD",
        eventWindowStart: "09:00",
        eventWindowEnd: "12:00",
      });
      const eventLabels = {
        ...labels,
        eventStartTimeLabel: "Hora de inicio de tu evento",
      };

      // Act
      render(
        <CartPageClient locale="en" globalServices={[]} labels={eventLabels} />,
      );

      // Assert — selector card heading appears after settings load
      await waitFor(() => {
        expect(
          screen.getByText("Hora de inicio de tu evento"),
        ).toBeInTheDocument();
      });
    });

    it("window configured + submit without choosing hour -> blocked and error shown", async () => {
      // Arrange
      const user = userEvent.setup();
      mocks.getStoreSettings.mockResolvedValue({
        deliveryMode: "INCLUDED",
        deliveryFee: 0,
        depositPercent: 0.1,
        paymentMode: "SPLIT_50_50",
        currency: "USD",
        eventWindowStart: "09:00",
        eventWindowEnd: "12:00",
      });
      const eventLabels = {
        ...labels,
        eventStartTimeLabel: "Hora de inicio de tu evento",
        eventStartTimeError: "Selecciona la hora de inicio de tu evento",
      };
      render(
        <CartPageClient locale="en" globalServices={[]} labels={eventLabels} />,
      );

      // Wait for the selector to appear so settings have loaded
      await waitFor(() => {
        expect(
          screen.getByText("Hora de inicio de tu evento"),
        ).toBeInTheDocument();
      });

      // Act — fill required customer fields but skip the hour selector
      await user.type(screen.getByLabelText("Name"), "Jane Doe");
      await user.type(screen.getByLabelText("Email"), "jane@example.com");
      await user.type(screen.getByLabelText("Phone"), "555-1111");
      await user.click(screen.getByRole("button", { name: "Confirm order" }));

      // Assert — placeOrder NOT called; error message displayed
      expect(mocks.placeOrder).not.toHaveBeenCalled();
      expect(
        screen.getByText("Selecciona la hora de inicio de tu evento"),
      ).toBeInTheDocument();
    });
  });

  describe("📍 DISTANCE_MILES", () => {
    it("selecting a place quotes the fee and renders the miles + fee in the summary", async () => {
      // Arrange
      const user = userEvent.setup();
      mocks.getStoreSettings.mockResolvedValue({
        deliveryMode: "DISTANCE_MILES",
        deliveryFee: 0,
        depositPercent: 0.1,
        paymentMode: "SPLIT_50_50",
        currency: "USD",
      });
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({ ok: true, miles: 7.2, fee: 35 }),
      });
      vi.stubGlobal("fetch", fetchMock);
      render(<CartPageClient locale="en" globalServices={[]} labels={labels} />);

      // Act: the autocomplete stub appears once settings resolve
      const selectButton = await screen.findByRole("button", {
        name: "stub-select-place",
      });
      await user.click(selectButton);

      // Assert: summary shows "Delivery (7.2 mi): $35.00"
      await waitFor(() => {
        expect(
          screen.getByTestId("cart-summary-distance-miles"),
        ).toHaveTextContent("7.2 mi");
      });
      expect(screen.getByTestId("cart-summary-delivery")).toHaveTextContent(
        "$35.00",
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/delivery/quote?destLat=32.78&destLng=-96.8",
        ),
        expect.anything(),
      );
    });
  });
});
