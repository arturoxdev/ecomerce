import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./availability-checker", () => ({
  AvailabilityChecker: ({ onAvailabilityConfirmed }: { onAvailabilityConfirmed?: (result: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onAvailabilityConfirmed?.({
          startDate: new Date(2026, 4, 10, 12),
          endDate: new Date(2026, 4, 12, 12),
          available: 4,
        })
      }
    >
      Confirm availability
    </button>
  ),
}));

vi.mock("./variant-selector", () => ({
  VariantSelector: () => <div>Variant selector</div>,
}));

vi.mock("@/components/quantity-selector", () => ({
  QuantitySelector: ({ value, onChange }: { value: number; onChange: (value: number) => void }) => (
    <div>
      <span data-testid="quantity-value">{value}</span>
      <button type="button" onClick={() => onChange(3)}>
        Set quantity to 3
      </button>
    </div>
  ),
}));

vi.mock("./add-to-cart-button", () => ({
  AddToCartButton: (props: unknown) => (
    <pre data-testid="add-to-cart-props">{JSON.stringify(props)}</pre>
  ),
}));

import { ProductDetailActions } from "./product-detail-actions";

describe("ProductDetailActions", () => {
  afterEach(() => {
    cleanup();
  });

  const labels = {
    price: "Price",
    pricePerUnit: "Price per unit",
    stock: "Stock",
    selectVariant: "Select variant",
    availability: {
      checkDates: "Check dates",
      startDate: "Start Date",
      endDate: "End Date",
      loading: "Loading",
      available: "Available",
      notAvailable: "Not available",
      unitsAvailable: "units available",
      invalidRange: "Invalid range",
      errorFetch: "Fetch error",
    },
    addToCart: "Add to cart",
    addedToCart: "Added",
    selectDatesFirst: "Select dates first",
    quantity: "Quantity",
    perUnit: "day",
  };

  function readAddToCartProps() {
    return JSON.parse(screen.getByTestId("add-to-cart-props").textContent ?? "{}");
  }

  describe("✅ Happy path", () => {
    it("PER_UNIT availability confirmation -> enables add to cart with normalized item payload", () => {
      // Arrange
      render(
        <ProductDetailActions
          productId="product-1"
          productName="Chair"
          productSlug="chair"
          productPhoto="/chair.png"
          basePrice={25}
          baseStock={6}
          priceType="PER_UNIT"
          variants={[]}
          labels={labels}
        />,
      );

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Confirm availability" }));

      // Assert
      expect(screen.getByTestId("quantity-value")).toHaveTextContent("1");
      expect(readAddToCartProps()).toMatchObject({
        disabled: false,
        item: {
          productId: "product-1",
          quantity: 1,
          startDate: "2026-05-10",
          endDate: "2026-05-12",
          stock: 4,
        },
      });
    });

    it("PER_UNIT quantity change -> updates add to cart item quantity", () => {
      // Arrange
      render(
        <ProductDetailActions
          productId="product-1"
          productName="Chair"
          productSlug="chair"
          productPhoto="/chair.png"
          basePrice={25}
          baseStock={6}
          priceType="PER_UNIT"
          variants={[]}
          labels={labels}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Confirm availability" }));

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Set quantity to 3" }));

      // Assert
      expect(readAddToCartProps()).toMatchObject({
        item: {
          quantity: 3,
        },
      });
    });
  });
});
