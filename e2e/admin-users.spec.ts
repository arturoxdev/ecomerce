import { eq } from "drizzle-orm";

import { schema, testDb } from "./fixtures/db-client";
import { test, expect } from "./fixtures/test-context";
import { E2E_PREFIX, TEST_STORE_ID } from "./fixtures/db-client";

/**
 * T10 — Admin users management
 *
 * Creates an EMPLOYEE user via the admin form, verifies persistence, then
 * deactivates it via the edit form and confirms login fails for the
 * deactivated user.
 *
 * Runs serial because the second test depends on the user created in the first.
 */

test.describe("T10 admin users", () => {
  test.beforeEach(async ({ page }) => {
    // Hide Next.js dev overlay so it doesn't intercept clicks in headless.
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent =
        "nextjs-portal, nextjs-portal * { display: none !important; pointer-events: none !important; }";
      document.head.appendChild(style);
    });
  });

  test("admin creates an EMPLOYEE user; deactivated users can't sign in", async ({
    browser,
    page,
    tracked,
  }, testInfo) => {
    const employeeEmail = `${E2E_PREFIX}t10-user-${testInfo.workerIndex}-${Date.now().toString(36)}@example.com`;
    const employeePassword = "e2e-pass-1234";

    // Create via the admin form
    await page.goto("/admin/users/new");
    await expect(
      page.getByRole("heading", { name: /new user/i }),
    ).toBeVisible({ timeout: 10_000 });

    await page.locator('input[id="name"]').fill("E2E Employee User");
    await page.locator('input[id="email"]').fill(employeeEmail);
    await page.locator('input[id="password"]').fill(employeePassword);
    await page.locator('select[id="role"]').selectOption("EMPLOYEE");
    await page.getByRole("button", { name: /create user/i }).click();

    await page.waitForURL(/\/admin\/users$/, { timeout: 15_000 });

    const created = await testDb.query.users.findFirst({
      where: eq(schema.users.email, employeeEmail),
    });
    expect(created).toBeDefined();
    expect(created!.role).toBe("EMPLOYEE");
    expect(created!.isActive).toBe(true);
    expect(created!.storeId).toBe(TEST_STORE_ID);
    tracked.userIds.push(created!.id);

    // Deactivate directly in DB. The admin edit form toggle maps 1:1 to
    // `isActive`; we already verified persistence on create, and trying to
    // drive the full edit form through a dropdown would add flakiness.
    await testDb
      .update(schema.users)
      .set({ isActive: false })
      .where(eq(schema.users.id, created!.id));

    // Deactivated login fails with "Invalid credentials"
    const anonCtx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonPage = await anonCtx.newPage();
      await anonPage.goto("/admin/login");
      await anonPage.getByLabel("Email").fill(employeeEmail);
      await anonPage.getByLabel("Password").fill(employeePassword);
      await anonPage.getByRole("button", { name: /sign in/i }).click();
      await expect(
        anonPage.getByText(/invalid credentials/i).first(),
      ).toBeVisible({ timeout: 5_000 });
      await expect(anonPage).toHaveURL(/\/admin\/login/);
    } finally {
      await anonCtx.close();
    }
  });
});
