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
    date: "2099-06-01",
    stock: 5,
    selectedServices: [],
    ...partial,
  };
}

describe("CartItem", () => {
  afterEach(() => cleanup());

  const labels = { remove: "Remove", quantity: "Qty", pastDateBadge: "Past date" };

  it("en locale with English name -> shows the translation", () => {
    render(
      <CartItem
        locale="en"
        item={buildItem({ productName: "Silla", productNameEn: "Chair" })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByText("Chair")).toBeInTheDocument();
    expect(screen.queryByText("Silla")).not.toBeInTheDocument();
  });

  it("es locale, or en without translation -> shows the Spanish name", () => {
    const { unmount } = render(
      <CartItem
        locale="es"
        item={buildItem({ productName: "Silla", productNameEn: "Chair" })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );
    expect(screen.getByText("Silla")).toBeInTheDocument();
    unmount();

    render(
      <CartItem
        locale="en"
        item={buildItem({ productName: "Silla" })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );
    expect(screen.getByText("Silla")).toBeInTheDocument();
  });

  it("item with quantity 2 -> shows subtotal 20.00", () => {
    // Arrange / Act
    render(
      <CartItem
        locale="en"
        item={buildItem({ quantity: 2, unitPrice: 10 })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    // Assert
    expect(screen.getByText("$20.00")).toBeInTheDocument();
  });

  it("single-stock item -> still shows the quantity selector", () => {
    // Arrange / Act
    render(
      <CartItem
        locale="en"
        item={buildItem({ quantity: 1, unitPrice: 50, stock: 1 })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    // Assert
    expect(screen.getAllByText("$50.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Qty")).toBeInTheDocument();
  });

  it("remove click -> onRemove called with item id", async () => {
    // Arrange
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <CartItem
        locale="en"
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
        locale="en"
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
        locale="en"
        item={buildItem({ date: "2020-01-01" })}
        onRemove={() => {}}
        onQuantityChange={() => {}}
        labels={labels}
      />,
    );

    expect(screen.getByText("Past date")).toBeInTheDocument();
  });
});
