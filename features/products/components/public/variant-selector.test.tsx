import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cheapestVariant,
  VariantSelector,
  type Variant,
} from "./variant-selector";

describe("VariantSelector", () => {
  afterEach(() => cleanup());

  const labels = {
    price: "Price",
    stock: "Stock",
    selectVariant: "Pick one",
  };

  const variants: Variant[] = [
    { id: "v1", name: "Red", price: 20, stock: 5 },
    { id: "v2", name: "Blue", price: 30, stock: 2 },
  ];

  it("selected variant -> shows its price and stock and marks its chip", () => {
    // Arrange / Act
    render(
      <VariantSelector
        variants={variants}
        selected={variants[0]}
        labels={labels}
        onVariantChange={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText("$20.00", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Stock:", { exact: false }).parentElement).toHaveTextContent("Stock: 5");
    expect(screen.getByRole("button", { name: "Red" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "false");
  });

  it("variant click -> notifies parent with that variant", () => {
    // Arrange
    const onVariantChange = vi.fn();
    render(
      <VariantSelector
        variants={variants}
        selected={variants[0]}
        labels={labels}
        onVariantChange={onVariantChange}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));

    // Assert
    expect(onVariantChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: "v2", name: "Blue" }),
    );
  });
});

describe("cheapestVariant", () => {
  it("returns the lowest-priced variant regardless of order", () => {
    expect(
      cheapestVariant([
        { id: "v2", name: "Blue", price: 30, stock: 2 },
        { id: "v1", name: "Red", price: 20, stock: 5 },
      ])?.id,
    ).toBe("v1");
  });

  it("price tie -> keeps the first one", () => {
    expect(
      cheapestVariant([
        { id: "a", name: "A", price: 10, stock: 1 },
        { id: "b", name: "B", price: 10, stock: 1 },
      ])?.id,
    ).toBe("a");
  });

  it("no variants -> null", () => {
    expect(cheapestVariant([])).toBeNull();
  });
});
