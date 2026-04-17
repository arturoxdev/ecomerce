import { test, expect } from "@playwright/test";

test.describe("public catalog", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("catalog page lists products", async ({ page }) => {
    await page.goto("/en/catalog");

    const viewDetailsLinks = page.getByRole("link", { name: /view details/i });
    await expect(viewDetailsLinks.first()).toBeVisible({ timeout: 10_000 });
    expect(await viewDetailsLinks.count()).toBeGreaterThan(0);
  });

  test("clicking a product opens its detail page", async ({ page }) => {
    await page.goto("/en/catalog");

    const firstProductLink = page
      .getByRole("link", { name: /view details/i })
      .first();
    await expect(firstProductLink).toBeVisible({ timeout: 10_000 });

    await firstProductLink.click();
    await expect(page).toHaveURL(/\/en\/catalog\/[^/]+$/);
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
