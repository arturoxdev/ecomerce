import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { alt, ...rest } = props as { alt?: string };
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img alt={alt ?? ""} {...rest} />;
  },
}));

import type { CartItem as CartItemType } from "@/lib/stores/cart-store";

import { CartItem } from "./cart-item";

function buildItem(partial: Partial<CartItemType> = {}): CartItemType {
  return {
    id: "item-1",
    productId: "p1",
    productName: "Chair",
    productSlug: "chair",
    productPhoto: null,
    variantId: null,
    variantName: null,
    quantity: 1,
    unitPrice: 10,
    priceType: "PER_UNIT",
    date: "2099-06-01",
    stock: 5,
    ...partial,
  };
}

describe("CartItem", () => {
  afterEach(() => cleanup());

  const labels = { remove: "Remove", quantity: "Qty", pastDateBadge: "Past date" };

  it("PER_UNIT item with quantity 2 -> shows subtotal 20.00", () => {
    // Arrange / Act
    render(
      <CartItem
        item={buildItem({ quantity: 2, unitPrice: 10 })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    // Assert
    expect(screen.getByText("$20.00")).toBeInTheDocument();
  });

  it("FIXED priceType -> shows unit price instead of quantity selector", () => {
    // Arrange / Act
    render(
      <CartItem
        item={buildItem({ priceType: "FIXED", quantity: 1, unitPrice: 50 })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    // Assert — unit price + subtotal both render at $50 for quantity 1
    expect(screen.getAllByText("$50.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Qty")).not.toBeInTheDocument();
  });

  it("remove click -> onRemove called with item id", async () => {
    // Arrange
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <CartItem
        item={buildItem({ id: "abc" })}
        onRemove={onRemove}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Remove" }));

    // Assert
    expect(onRemove).toHaveBeenCalledWith("abc");
  });

  it("variant name present -> rendered below product name", () => {
    render(
      <CartItem
        item={buildItem({ variantName: "Red" })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByText("Red")).toBeInTheDocument();
  });

  it("date in the past -> renders past date badge", () => {
    render(
      <CartItem
        item={buildItem({ date: "2020-01-01" })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByText("Past date")).toBeInTheDocument();
  });
});
