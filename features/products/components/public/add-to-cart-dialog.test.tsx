import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AvailabilityResult } from "./availability-checker";

const mocks = vi.hoisted(() => ({
  addItem: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/stores/cart-store", () => ({
  useCartStore: (
    selector: (state: { addItem: typeof mocks.addItem }) => unknown,
  ) => selector({ addItem: mocks.addItem }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess },
}));

vi.mock("./availability-checker", () => ({
  AvailabilityCheckerBody: ({
    onAvailabilityConfirmed,
    onUnavailable,
  }: {
    onAvailabilityConfirmed?: (result: AvailabilityResult) => void;
    onUnavailable?: () => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onAvailabilityConfirmed?.({
            date: new Date(2099, 4, 10, 12),
            available: 4,
          })
        }
      >
        Confirm availability
      </button>
      <button type="button" onClick={() => onUnavailable?.()}>
        Clear availability
      </button>
    </div>
  ),
}));

vi.mock("@/components/quantity-selector", () => ({
  QuantitySelector: ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (value: number) => void;
  }) => (
    <div>
      <span data-testid="qty">{value}</span>
      <button type="button" onClick={() => onChange(3)}>
        Set qty 3
      </button>
    </div>
  ),
}));

import { AddToCartDialog } from "./add-to-cart-dialog";

describe("AddToCartDialog", () => {
  const labels = {
    availability: {
      checkDates: "Check availability",
      selectDate: "Select a date",
      loading: "Loading",
      available: "Available",
      notAvailable: "Not available",
      unitsAvailable: "units",
      errorFetch: "Error",
    },
    addToCart: "Add to cart",
    addedToCart: "Added",
    selectDatesFirst: "Select dates first",
    quantity: "Qty",
  };

  const baseProps = {
    productId: "p1",
    productName: "Chair",
    productSlug: "chair",
    productPhoto: null,
    variantId: null,
    variantName: null,
    unitPrice: 10,
    stock: 5,
    labels,
  };

  beforeEach(() => {
    mocks.addItem.mockReset();
    mocks.toastSuccess.mockReset();
  });

  afterEach(() => cleanup());

  describe("✅ Happy path", () => {
    it("trigger click opens modal and surfaces the availability header", () => {
      // Arrange
      render(<AddToCartDialog {...baseProps} priceType="FIXED" />);

      // Act
      fireEvent.click(
        screen.getAllByRole("button", { name: "Add to cart" })[0]!,
      );

      // Assert
      expect(screen.getByText("Check availability")).toBeInTheDocument();
    });

    it("confirming availability enables the inner Add button and adds item with dates on click", () => {
      // Arrange
      render(<AddToCartDialog {...baseProps} priceType="PER_UNIT" />);
      fireEvent.click(
        screen.getAllByRole("button", { name: "Add to cart" })[0]!,
      );
      const innerButton = screen.getByTestId("add-to-cart-button");
      expect(innerButton).toBeDisabled();

      // Act
      fireEvent.click(
        screen.getByRole("button", { name: "Confirm availability" }),
      );

      // Assert
      expect(innerButton).not.toBeDisabled();

      // Act — click to add
      fireEvent.click(innerButton);

      // Assert
      expect(mocks.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: "p1",
          variantId: null,
          priceType: "PER_UNIT",
          quantity: 1,
          date: "2099-05-10",
          stock: 4,
        }),
      );
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Added");
    });

    it("quantity change -> add-to-cart payload reflects new quantity", () => {
      // Arrange
      render(<AddToCartDialog {...baseProps} priceType="PER_UNIT" />);
      fireEvent.click(
        screen.getAllByRole("button", { name: "Add to cart" })[0]!,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Confirm availability" }),
      );

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Set qty 3" }));
      fireEvent.click(screen.getByTestId("add-to-cart-button"));

      // Assert
      expect(mocks.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 3 }),
      );
    });

    it("clearing availability re-disables the inner Add button", () => {
      // Arrange
      render(<AddToCartDialog {...baseProps} priceType="PER_UNIT" />);
      fireEvent.click(
        screen.getAllByRole("button", { name: "Add to cart" })[0]!,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Confirm availability" }),
      );

      // Act
      fireEvent.click(
        screen.getByRole("button", { name: "Clear availability" }),
      );

      // Assert
      expect(screen.getByTestId("add-to-cart-button")).toBeDisabled();
    });
  });
});
