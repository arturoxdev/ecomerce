import { test, expect } from "@playwright/test";

test.describe("admin login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("happy path: valid credentials redirect to products dashboard", async ({
    page,
  }) => {
    const email = process.env.TEST_ADMIN_EMAIL;
    const password = process.env.TEST_ADMIN_PASSWORD;
    test.skip(
      !email || !password,
      "TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set",
    );

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/admin/products");
    await expect(page).toHaveURL(/\/admin\/products/);
  });

  test("invalid credentials show an error message", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
