import { test, expect } from "./fixtures/test-context";
import { daysFromToday } from "./fixtures/storefront-helpers";

/**
 * T5 — Admin orders listing + detail
 *
 * Seeds two orders (one with a variant, one without) and verifies both are
 * discoverable via the admin orders table and their detail pages render the
 * expected rental period, totals and customer info.
 */

test.describe("T5 admin orders", () => {
  test("admin can find a seeded order and review its detail", async ({
    page,
    seed,
  }) => {
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      basePrice: "40.00",
      stock: 5,
    });
    const variant = await seed.createVariant(product.id, {
      name: "XL",
      price: "55.00",
      stock: 3,
    });

    const rentStart = daysFromToday(4);
    const rentEnd = daysFromToday(6);

    const { order } = await seed.createOrder({
      items: [
        {
          productId: product.id,
          variantId: variant.id,
          quantity: 2,
          unitPrice: 55,
          start: rentStart,
          end: rentEnd,
        },
      ],
      deliveryFee: 15,
      depositPercent: 0.2,
      customer: {
        name: "E2E Orders Listing",
        phone: "+1-555-444-5555",
      },
    });

    // subtotal = 2 * 55 = 110; total = 110 + 15 = 125
    expect(order.subtotal).toBe("110.00");
    expect(order.total).toBe("125.00");

    await page.goto("/admin/orders");

    const row = page.locator(
      `[data-testid="admin-order-row"][data-order-id="${order.id}"]`,
    );
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText("E2E Orders Listing");
    await expect(row).toContainText("$125.00");
    await expect(row).toContainText(order.id.slice(0, 8).toUpperCase());

    // Open detail
    await row.getByRole("link").first().click();
    await page.waitForURL(new RegExp(`/admin/orders/${order.id}`));

    await expect(page.getByText("E2E Orders Listing").first()).toBeVisible();
    await expect(page.getByText("+1-555-444-5555").first()).toBeVisible();
    // The totals block shows both the subtotal and the total
    await expect(page.getByText("$110.00").first()).toBeVisible();
    await expect(page.getByText("$125.00").first()).toBeVisible();
    // Variant name should surface in the line items
    await expect(page.getByText("XL").first()).toBeVisible();
  });
});
