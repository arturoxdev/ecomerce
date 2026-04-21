import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { AddToCartButton } from "./add-to-cart-button";

describe("AddToCartButton", () => {
  const item = {
    productId: "p1",
    productName: "Chair",
    productSlug: "chair",
    productPhoto: null,
    variantId: null,
    variantName: null,
    quantity: 1,
    unitPrice: 10,
    priceType: "FIXED" as const,
    startDate: "2026-06-01",
    endDate: "2026-06-02",
    stock: 5,
  };

  beforeEach(() => {
    mocks.addItem.mockReset();
    mocks.toastSuccess.mockReset();
  });
  afterEach(() => cleanup());

  it("click enabled button -> adds item to store and shows toast", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AddToCartButton item={item} label="Add" addedLabel="Added" />,
    );

    // Act
    await user.click(screen.getByTestId("add-to-cart-button"));

    // Assert
    expect(mocks.addItem).toHaveBeenCalledWith(item);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Added");
  });

  it("disabled -> click does not add item", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AddToCartButton
        item={item}
        label="Add"
        addedLabel="Added"
        disabled
        disabledMessage="Select dates"
      />,
    );

    // Act
    await user.click(screen.getByTestId("add-to-cart-button"));

    // Assert
    expect(mocks.addItem).not.toHaveBeenCalled();
  });
});
