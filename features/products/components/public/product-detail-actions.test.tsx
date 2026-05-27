import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./add-to-cart-dialog", () => ({
  AddToCartDialog: (props: unknown) => (
    <pre data-testid="add-to-cart-dialog-props">{JSON.stringify(props)}</pre>
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
      selectDate: "Select a date",
      loading: "Loading",
      available: "Available",
      notAvailable: "Not available",
      unitsAvailable: "units available",
      errorFetch: "Fetch error",
    },
    addToCart: "Add to cart",
    addedToCart: "Added",
    selectDatesFirst: "Select dates first",
    quantity: "Quantity",
    perUnit: "day",
    services: {
      sectionTitle: "Additional Services",
      optionalAddOns: "Optional add-ons",
    },
  };

  function readDialogProps() {
    return JSON.parse(
      screen.getByTestId("add-to-cart-dialog-props").textContent ?? "{}",
    );
  }

  describe("✅ Happy path", () => {
    it("no variants -> renders price + AddToCartDialog with base product info", () => {
      // Arrange / Act
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
          localServices={[]}
          labels={labels}
        />,
      );

      // Assert
      expect(screen.getByText("$25.00", { exact: false })).toBeInTheDocument();
      expect(readDialogProps()).toMatchObject({
        productId: "product-1",
        productName: "Chair",
        productSlug: "chair",
        productPhoto: "/chair.png",
        variantId: null,
        variantName: null,
        unitPrice: 25,
        priceType: "PER_UNIT",
        stock: 6,
        labels: {
          addToCart: "Add to cart",
          addedToCart: "Added",
          selectDatesFirst: "Select dates first",
          quantity: "Quantity",
        },
      });
    });

    it("with variants -> selecting a variant forwards its id/price/stock to the dialog", () => {
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
          variants={[
            { id: "v1", name: "Red", price: 20, stock: 5 },
            { id: "v2", name: "Blue", price: 30, stock: 2 },
          ]}
          localServices={[]}
          labels={labels}
        />,
      );

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Blue" }));

      // Assert
      expect(readDialogProps()).toMatchObject({
        variantId: "v2",
        variantName: "Blue",
        unitPrice: 30,
        stock: 2,
      });
    });
  });
});
