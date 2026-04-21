import { test, expect } from "./fixtures/test-context";
import {
  daysFromToday,
  toLocalDateString,
} from "./fixtures/storefront-helpers";

/**
 * T12 — Admin calendar schedule
 *
 * Seeds two orders that share the same rent-start date and verifies the admin
 * calendar schedule page lists both deliveries when that date is selected.
 */

test.describe("T12 admin calendar schedule", () => {
  test("schedule for a target date shows seeded deliveries", async ({
    page,
    seed,
  }) => {
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      basePrice: "40.00",
      stock: 10,
    });

    const deliveryDate = daysFromToday(8);
    const returnDate = daysFromToday(10);

    const orderAlpha = await seed.createOrder({
      items: [
        {
          productId: product.id,
          quantity: 1,
          unitPrice: 40,
          start: deliveryDate,
          end: returnDate,
        },
      ],
      customer: {
        name: "E2E Calendar Alpha",
        phone: "+1-555-111-1111",
      },
    });
    const orderBeta = await seed.createOrder({
      items: [
        {
          productId: product.id,
          quantity: 1,
          unitPrice: 40,
          start: deliveryDate,
          end: returnDate,
        },
      ],
      customer: {
        name: "E2E Calendar Beta",
        phone: "+1-555-222-2222",
      },
    });

    await page.goto("/admin/calendar");
    const dateInput = page.locator('input[id="schedule-date"]');

    // React-controlled <input type="date"> ignores Playwright's `fill()` in
    // some environments because it bypasses React's synthetic event system.
    // Use the native input value setter + dispatchEvent pattern to push the
    // value through React's onChange handler.
    await dateInput.evaluate((el, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, toLocalDateString(deliveryDate));

    // Wait for the schedule fetch: the counter flips to "2 entries".
    await expect(page.getByText(/2 entries/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Both orders should appear as deliveries on the target date
    const alphaRow = page
      .getByRole("row")
      .filter({ hasText: "E2E Calendar Alpha" });
    const betaRow = page
      .getByRole("row")
      .filter({ hasText: "E2E Calendar Beta" });

    await expect(alphaRow).toBeVisible({ timeout: 10_000 });
    await expect(betaRow).toBeVisible();

    await expect(alphaRow).toContainText("Entrega");
    await expect(alphaRow).toContainText(
      orderAlpha.order.id.slice(0, 8).toUpperCase(),
    );
    await expect(betaRow).toContainText("Entrega");
    await expect(betaRow).toContainText(
      orderBeta.order.id.slice(0, 8).toUpperCase(),
    );
  });
});
