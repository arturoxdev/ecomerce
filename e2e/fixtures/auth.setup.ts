import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const adminAuthFile = path.join(__dirname, "..", ".auth", "admin.json");

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in .env.local",
    );
  }

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("**/admin/products", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/admin\/products/);

  await page.context().storageState({ path: adminAuthFile });
});
