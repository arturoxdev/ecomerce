import { eq } from "drizzle-orm";

import { schema, testDb } from "./fixtures/db-client";
import { test, expect } from "./fixtures/test-context";
import { daysFromToday } from "./fixtures/storefront-helpers";

/**
 * PR-001 — Admin manual orders
 *
 * Validates the surfaces that this PR introduces:
 *  • The "Crear orden" trigger is visible on /admin/orders for ROOT/ADMIN.
 *  • A manual order can be cancelled from its detail page; cancelling
 *    transitions the order to CANCELLED + VOIDED and frees the availability
 *    rows linked to it.
 *
 * The full create-order Sheet flow (calendar + variant picker) is covered by
 * unit/component tests; this spec focuses on the high-value persistence and
 * permission paths that an admin would exercise in production.
 */

test.describe("PR-001 admin manual orders", () => {
  test('"Crear orden" button is visible on /admin/orders', async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(
      page.getByRole("button", { name: /crear orden/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("admin cancels a manual order -> CANCELLED + VOIDED + availability freed", async ({
    page,
    seed,
  }) => {
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      basePrice: "75.00",
      stock: 1,
    });

    const rentDate = daysFromToday(7);
    const { order } = await seed.createOrder({
      items: [
        {
          productId: product.id,
          variantId: null,
          quantity: 1,
          unitPrice: 75,
          start: rentDate,
          end: rentDate,
        },
      ],
      customer: { name: "PR-001 Cancel Target" },
      status: "CONFIRMED",
    });

    // Sanity: availability should exist for this order before cancelling
    const beforeRows = await testDb.query.availability.findMany({
      where: eq(schema.availability.orderId, order.id),
    });
    expect(beforeRows).toHaveLength(1);

    await page.goto(`/admin/orders/${order.id}`);

    const cancelButton = page.getByTestId("cancel-order-button");
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    const confirmButton = page.getByRole("button", { name: /sí, cancelar/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for revalidation: the page refreshes and shows CANCELLED badge
    await expect(page.getByText("CANCELLED").first()).toBeVisible({
      timeout: 10_000,
    });

    const updated = await testDb.query.orders.findFirst({
      where: eq(schema.orders.id, order.id),
    });
    expect(updated?.status).toBe("CANCELLED");
    expect(updated?.paymentStatus).toBe("VOIDED");

    const afterRows = await testDb.query.availability.findMany({
      where: eq(schema.availability.orderId, order.id),
    });
    expect(afterRows).toHaveLength(0);
  });
});
