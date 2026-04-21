import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VariantSelector, type Variant } from "./variant-selector";

describe("VariantSelector", () => {
  afterEach(() => cleanup());

  const labels = {
    price: "Price",
    pricePerUnit: "day",
    stock: "Stock",
    selectVariant: "Pick one",
  };

  const variants: Variant[] = [
    { id: "v1", name: "Red", price: 20, stock: 5 },
    { id: "v2", name: "Blue", price: 30, stock: 2 },
  ];

  it("no variant selected -> shows base price and base stock", () => {
    // Arrange / Act
    render(
      <VariantSelector
        basePrice={15}
        baseStock={10}
        pricingModel="PER_UNIT"
        variants={variants}
        labels={labels}
      />,
    );

    // Assert
    expect(screen.getByText("$15.00", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Stock:", { exact: false })).toBeInTheDocument();
  });

  it("variant click -> switches price and notifies parent", () => {
    // Arrange
    const onVariantChange = vi.fn();
    render(
      <VariantSelector
        basePrice={15}
        baseStock={10}
        pricingModel="PER_UNIT"
        variants={variants}
        labels={labels}
        onVariantChange={onVariantChange}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));

    // Assert
    expect(screen.getByText("$30.00", { exact: false })).toBeInTheDocument();
    expect(onVariantChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: "v2", name: "Blue" }),
    );
  });

  it("click selected variant again -> deselects and restores base price", () => {
    // Arrange
    const onVariantChange = vi.fn();
    render(
      <VariantSelector
        basePrice={15}
        baseStock={10}
        pricingModel="PER_UNIT"
        variants={variants}
        labels={labels}
        onVariantChange={onVariantChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Red" }));

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Red" }));

    // Assert
    expect(onVariantChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText("$15.00", { exact: false })).toBeInTheDocument();
  });

  it("FIXED pricing -> no stock label rendered", () => {
    // Arrange / Act
    render(
      <VariantSelector
        basePrice={15}
        baseStock={10}
        pricingModel="FIXED"
        variants={variants}
        labels={labels}
      />,
    );

    // Assert
    expect(screen.queryByText("Stock:", { exact: false })).not.toBeInTheDocument();
  });
});
