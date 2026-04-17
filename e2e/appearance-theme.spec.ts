import { eq } from "drizzle-orm";

import { schema, testDb, TEST_STORE_ID } from "./fixtures/db-client";
import { test, expect } from "./fixtures/test-context";
import { readTestSettings, type Settings } from "./fixtures/test-context";

/**
 * T13 — Appearance / theme switcher
 *
 * Picks a theme different from the current one, saves, verifies DB persists
 * the selection, and restores the original theme in afterAll so the real
 * store settings aren't polluted.
 */

test.describe.configure({ mode: "serial" });

test.describe("T13 appearance theme switcher", () => {
  let snapshot: Settings;

  test.beforeAll(async () => {
    snapshot = await readTestSettings();
  });

  test.afterAll(async () => {
    await testDb
      .update(schema.settings)
      .set({ themeId: snapshot.themeId })
      .where(eq(schema.settings.storeId, TEST_STORE_ID));
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent =
        "nextjs-portal, nextjs-portal * { display: none !important; pointer-events: none !important; }";
      document.head.appendChild(style);
    });
  });

  test("switching to another theme persists in DB", async ({ page }) => {
    await page.goto("/admin/settings/appearance");

    // Pick any preset that differs from the current one. "sunset" and
    // "default" are both in the THEMES registry; swap accordingly.
    const targetTheme =
      snapshot.themeId === "sunset" ? "default" : "sunset";

    await page.getByTestId(`theme-option-${targetTheme}`).click();
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(
      page.getByText(/theme updated/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    const row = await testDb.query.settings.findFirst({
      where: eq(schema.settings.storeId, TEST_STORE_ID),
    });
    expect(row?.themeId).toBe(targetTheme);

    // Verify a page reload reflects the same selection (dirty=false after
    // save, so the Save button should be disabled again until user changes it)
    await page.reload();
    await expect(page.getByRole("button", { name: /^save$/i })).toBeDisabled();
  });
});
