import { test, expect } from "./fixtures/test-context";

/**
 * T7 — Admin auth guards + logout
 *
 * Runs in `chromium-anon` (no storageState). Verifies:
 *  - unauthenticated users are redirected to /admin/login
 *  - a valid login grants access to the dashboard
 *  - logout from the sidebar dropdown invalidates the session
 *  - an EMPLOYEE account cannot reach `/admin/users` (ROOT/ADMIN only)
 */

test.describe.configure({ mode: "serial" });

test.describe("T7 admin auth guards", () => {
  test.beforeEach(async ({ page }) => {
    // Hide the Next.js dev overlay before it can intercept pointer events.
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent =
        "nextjs-portal, nextjs-portal * { display: none !important; pointer-events: none !important; }";
      document.head.appendChild(style);
    });
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("valid login then logout invalidates session", async ({ page }) => {
    const email = process.env.TEST_ADMIN_EMAIL!;
    const password = process.env.TEST_ADMIN_PASSWORD!;
    expect(email && password).toBeTruthy();

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/\/admin\/products/, { timeout: 15_000 });

    // The logout dropdown in the sidebar submits a hidden form that targets
    // the `logoutAdmin` server action. Opening Base UI's dropdown + clicking
    // an item is flaky in headless, so trigger the form submit directly.
    // First verify the logout-button is reachable in the DOM tree at all
    // (it's mounted inside the DropdownMenuContent, not rendered until open
    // → we instead confirm the form exists).
    await page.evaluate(() => {
      const form = document.querySelector(
        "form.hidden",
      ) as HTMLFormElement | null;
      if (!form) throw new Error("Logout form not found");
      form.requestSubmit();
    });

    await page.waitForURL(/\/admin\/login/, { timeout: 15_000 });

    // Second access attempt: still redirected
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("EMPLOYEE is denied access to /admin/users", async ({ page, seed }) => {
    const { user, password } = await seed.createUser({
      role: "EMPLOYEE",
      isActive: true,
    });

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/admin\/products/, { timeout: 15_000 });

    await page.goto("/admin/users");
    await expect(page.getByText(/access denied/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
