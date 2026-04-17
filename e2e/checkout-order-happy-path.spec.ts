import { eq } from "drizzle-orm";

import { schema, testDb } from "./fixtures/db-client";
import {
  test,
  expect,
  readTestSettings,
  upsertTestSettings,
  type Settings,
} from "./fixtures/test-context";
import {
  addToCartFromProductPage,
  daysFromToday,
  fillCheckoutForm,
  newAdminContext,
  submitOrder,
} from "./fixtures/storefront-helpers";

/**
 * T1 — Checkout happy path
 *
 * Storefront anon selects dates, adds to cart, fills checkout form, submits
 * `placeOrder`, and the resulting order is visible in the admin listing with
 * the totals persisted in DB matching the summary shown to the user.
 *
 * Determinism: fixes settings to FIXED_FEE / $25 delivery / 30% deposit so the
 * cart math is predictable. Snapshot/restore in beforeAll/afterAll.
 */

test.describe("T1 checkout order happy path", () => {
  let settingsSnapshot: Settings;

  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeAll(async () => {
    settingsSnapshot = await readTestSettings();
    await upsertTestSettings({
      deliveryMode: "FIXED_FEE",
      deliveryFee: "25.00",
      depositPercent: "0.3000",
    });
  });

  test.afterAll(async () => {
    await upsertTestSettings({
      deliveryMode: settingsSnapshot.deliveryMode,
      deliveryFee: settingsSnapshot.deliveryFee,
      depositPercent: settingsSnapshot.depositPercent,
      themeId: settingsSnapshot.themeId,
    });
  });

  test("customer completes checkout and order lands in admin", async ({
    browser,
    page,
    seed,
  }) => {
    // Seed
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      basePrice: "100.00",
      priceType: "FIXED",
      stock: 2,
    });

    const start = daysFromToday(3);
    const end = daysFromToday(5);

    // Storefront: product detail → cart
    await page.goto(`/en/catalog/${product.slug}`);
    await expect(
      page.getByRole("heading", { name: product.name }),
    ).toBeVisible();

    await addToCartFromProductPage(page, { start, end });

    await page.goto("/en/cart");
    await expect(
      page.getByRole("heading", { name: /your cart/i }),
    ).toBeVisible();

    // Summary reflects seeded settings: $100 subtotal + $25 delivery = $125 total
    // Deposit is 30% of subtotal = $30 (shown separately, not added to total)
    await expect(page.getByTestId("cart-summary-subtotal")).toHaveText(
      "$100.00",
    );
    await expect(page.getByTestId("cart-summary-delivery")).toHaveText(
      "$25.00",
    );
    await expect(page.getByTestId("cart-summary-deposit")).toHaveText("$30.00");
    await expect(page.getByTestId("cart-summary-total")).toHaveText("$125.00");

    const email = `e2e-t1-${Date.now().toString(36)}@example.com`;
    await fillCheckoutForm(page, {
      name: "E2E Happy Path Customer",
      email,
      phone: "+1-555-000-1111",
      address: "742 Evergreen Terrace",
    });

    const orderId = await submitOrder(page);

    // Confirmation page shows the short id
    await expect(page.getByTestId("order-confirmation-number")).toHaveText(
      orderId.slice(0, 8).toUpperCase(),
    );

    // DB assertion: totals match the summary exactly
    const orderRow = await testDb.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
    });
    expect(orderRow).toBeDefined();
    expect(orderRow!.customerEmail).toBe(email);
    expect(orderRow!.subtotal).toBe("100.00");
    expect(orderRow!.deliveryFee).toBe("25.00");
    expect(orderRow!.depositAmount).toBe("30.00");
    expect(orderRow!.total).toBe("125.00");
    expect(orderRow!.paymentStatus).toBe("AUTHORIZED");
    expect(orderRow!.status).toBe("CONFIRMED");

    const items = await testDb
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId));
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe(product.id);

    const availability = await testDb
      .select()
      .from(schema.availability)
      .where(eq(schema.availability.orderId, orderId));
    expect(availability).toHaveLength(1);

    // Admin assertion: open a second context with admin storage state
    const adminContext = await newAdminContext(browser);
    try {
      const adminPage = await adminContext.newPage();
      await adminPage.goto("/admin/orders");
      const orderRowLocator = adminPage.locator(
        `[data-testid="admin-order-row"][data-order-id="${orderId}"]`,
      );
      await expect(orderRowLocator).toBeVisible({ timeout: 10_000 });
      await expect(orderRowLocator).toContainText(
        orderId.slice(0, 8).toUpperCase(),
      );
      await expect(orderRowLocator).toContainText(email);
      await expect(orderRowLocator).toContainText("$125.00");
    } finally {
      await adminContext.close();
    }
  });
});
