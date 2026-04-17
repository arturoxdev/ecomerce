import { test, expect } from "./fixtures/test-context";
import {
  addToCartFromProductPage,
  daysFromToday,
} from "./fixtures/storefront-helpers";

/**
 * T8 — Cart persistence + checkout form validations
 *
 * Two scenarios:
 *  A) The zustand cart (key "festejos-cart") survives a full page reload.
 *  B) Empty / invalid customer fields block `placeOrder` with inline errors.
 *
 * Runs in chromium-anon (no admin session).
 */

test.describe("T8 cart validation and persistence", () => {
  test("cart survives a page reload", async ({ page, seed }) => {
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      basePrice: "42.00",
      stock: 3,
    });

    const start = daysFromToday(3);
    const end = daysFromToday(4);

    await page.goto(`/en/catalog/${product.slug}`);
    await addToCartFromProductPage(page, { start, end });

    await page.goto("/en/cart");
    await expect(
      page.getByRole("heading", { name: product.name, level: 3 }),
    ).toBeVisible();

    // Reload — zustand persist keeps the item under "festejos-cart"
    await page.reload();
    await expect(
      page.getByRole("heading", { name: product.name, level: 3 }),
    ).toBeVisible({ timeout: 10_000 });

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("festejos-cart") ?? "{}"),
    );
    expect(stored?.state?.items?.length).toBeGreaterThanOrEqual(1);
  });

  test("empty customer fields are rejected", async ({ page, seed }) => {
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      basePrice: "30.00",
      stock: 3,
    });

    const start = daysFromToday(6);
    const end = daysFromToday(7);

    await page.goto(`/en/catalog/${product.slug}`);
    await addToCartFromProductPage(page, { start, end });

    await page.goto("/en/cart");

    // Leave all fields empty and try to submit
    await page.getByRole("button", { name: /confirm order/i }).click();
    // Inline errors show "Required" next to the offending inputs
    await expect(page.getByText(/required/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/en\/cart/);

    // Fill with an invalid email
    await page.locator("#name").fill("E2E Validation");
    await page.locator("#email").fill("not-an-email");
    await page.locator("#phone").fill("+1-555-999-0000");
    await page.getByRole("button", { name: /confirm order/i }).click();

    await expect(
      page.getByText(/valid email required/i).first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/en\/cart/);
  });
});
