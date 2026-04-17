import { test, expect, type Page } from "@playwright/test";

test.describe("cart flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // Mock availability API so the test is deterministic and doesn't depend
    // on real DB inventory / blocked dates.
    await page.route("**/api/availability*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available: 10 }),
      });
    });
  });

  test("adds three products to the cart and verifies them", async ({
    page,
  }) => {
    await page.goto("/en/catalog");

    const viewDetailsLinks = page.getByRole("link", { name: /view details/i });
    await expect(viewDetailsLinks.first()).toBeVisible({ timeout: 10_000 });

    const totalProducts = await viewDetailsLinks.count();
    expect(
      totalProducts,
      "Need at least 3 products in catalog to run this test",
    ).toBeGreaterThanOrEqual(3);

    // Collect the first 3 products: their slug + name
    const productsToAdd: { name: string; slug: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const link = viewDetailsLinks.nth(i);
      const href = await link.getAttribute("href");
      expect(href, `product ${i} should have an href`).toBeTruthy();
      const slug = href!.split("/").filter(Boolean).pop()!;

      // The name lives in an <h3> inside the same product card
      const card = link.locator(
        "xpath=ancestor::*[contains(@class,'rounded-xl')][1]",
      );
      const name = (await card.locator("h3").first().textContent())?.trim();
      expect(name, `product ${i} should have a name`).toBeTruthy();

      productsToAdd.push({ name: name!, slug });
    }

    // Add each product to the cart via its detail page
    for (let i = 0; i < productsToAdd.length; i++) {
      await addProductToCart(page, productsToAdd[i].slug, i + 1);
    }

    // Navigate to cart and verify all 3 products are listed
    await page.goto("/en/cart");
    await expect(page.getByRole("heading", { name: /your cart/i })).toBeVisible();

    for (const product of productsToAdd) {
      await expect(
        page.getByRole("heading", { level: 3, name: product.name }),
      ).toBeVisible();
    }
  });
});

/**
 * Opens a product detail page, picks two dates from the availability
 * calendar, waits for the Add to Cart button to enable, and clicks it.
 * Verifies the zustand cart store (persisted to localStorage) reaches
 * `expectedCountAfter` items before returning.
 */
async function addProductToCart(
  page: Page,
  slug: string,
  expectedCountAfter: number,
) {
  await page.goto(`/en/catalog/${slug}`);

  // Pick first available day (start) and a later one (end) in the calendar
  const enabledDays = page.locator("button[data-day]:not([disabled])");
  await expect(enabledDays.first()).toBeVisible({ timeout: 10_000 });

  await enabledDays.nth(0).click();
  const total = await enabledDays.count();
  const endIndex = Math.min(3, total - 1);
  await enabledDays.nth(endIndex).click();

  // Wait for availability check to resolve and Add to Cart to become enabled
  const addToCartBtn = page.getByRole("button", { name: /add to cart/i });
  await expect(addToCartBtn).toBeEnabled({ timeout: 10_000 });
  await addToCartBtn.click();

  // Verify the "Added to cart!" toast appears (sonner Toaster is mounted in
  // the root layout) and that the item landed in the zustand store
  // (persisted under localStorage key `festejos-cart`).
  await expect(page.getByText(/added to cart/i).first()).toBeVisible({
    timeout: 5_000,
  });
  await page.waitForFunction(
    (expected) => {
      const raw = localStorage.getItem("festejos-cart");
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return (parsed?.state?.items?.length ?? 0) >= expected;
      } catch {
        return false;
      }
    },
    expectedCountAfter,
    { timeout: 5_000 },
  );
}
