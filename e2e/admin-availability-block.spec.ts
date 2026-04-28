import { and, eq, isNull } from "drizzle-orm";

import { schema, testDb } from "./fixtures/db-client";
import { test, expect } from "./fixtures/test-context";
import {
  daysFromToday,
  selectDateRange,
  toLocalDateString,
  waitForAvailabilityCheck,
} from "./fixtures/storefront-helpers";

/**
 * T3 — Manual availability block blocks storefront
 *
 * Admin creates a manual block on a product for a date range; the public
 * product page must show that range as unavailable. Deleting the block
 * restores availability after a refresh.
 */

test.describe("T3 admin manual availability block", () => {
  test("manual block from admin reflects in storefront and delete restores availability", async ({
    browser,
    page,
    seed,
  }) => {
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      stock: 1,
    });

    const blockStart = daysFromToday(10);
    const blockEnd = blockStart;

    // Admin: create the block
    await page.goto(`/admin/products/${product.id}/availability`);
    await page
      .locator('input[id="date"]')
      .fill(toLocalDateString(blockStart));
    await page.locator('input[id="reason"]').fill("e2e-maintenance");
    await page.getByRole("button", { name: /create block/i }).click();

    await expect(
      page.getByText(/block created successfully/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    // DB: the manual block exists with orderId null
    const manualRows = await testDb
      .select()
      .from(schema.availability)
      .where(
        and(
          eq(schema.availability.productId, product.id),
          isNull(schema.availability.orderId),
        ),
      );
    expect(manualRows).toHaveLength(1);
    const blockId = manualRows[0].id;
    expect(manualRows[0].reason).toBe("e2e-maintenance");

    // Storefront anon: same range must report unavailable
    const anonContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonPage = await anonContext.newPage();
      await anonPage.goto(`/en/catalog/${product.slug}`);
      await selectDateRange(anonPage, blockStart, blockEnd);
      await waitForAvailabilityCheck(anonPage, { expect: "unavailable" });
      await expect(
        anonPage.getByTestId("add-to-cart-button"),
      ).toBeDisabled();
    } finally {
      await anonContext.close();
    }

    // Admin: delete the block
    await page.goto(`/admin/products/${product.id}/availability`);
    await page
      .getByRole("row")
      .filter({ hasText: "Manual block" })
      .getByRole("button")
      .click();
    await page.getByRole("button", { name: /^delete$/i }).click();

    await expect(
      page.getByText(/block deleted/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    const remaining = await testDb
      .select()
      .from(schema.availability)
      .where(eq(schema.availability.id, blockId));
    expect(remaining).toHaveLength(0);

    // Storefront anon: after delete the same range should be available again
    const anonContext2 = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonPage = await anonContext2.newPage();
      await anonPage.goto(`/en/catalog/${product.slug}`);
      await selectDateRange(anonPage, blockStart, blockEnd);
      await waitForAvailabilityCheck(anonPage, { expect: "available" });
      await expect(
        anonPage.getByTestId("add-to-cart-button"),
      ).toBeEnabled();
    } finally {
      await anonContext2.close();
    }
  });
});
