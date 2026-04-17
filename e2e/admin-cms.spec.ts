import { and, eq } from "drizzle-orm";

import { schema, testDb, TEST_STORE_ID } from "./fixtures/db-client";
import { test, expect } from "./fixtures/test-context";

/**
 * T11 — Admin CMS (About page)
 *
 * Edits the About page `eyebrow` field in English, verifies the public
 * `/en/about` page reflects the change, and restores the previous content in
 * `afterAll` so we don't pollute the real CMS snapshot.
 *
 * Serial to avoid races with itself.
 */

type AboutRow = typeof schema.aboutPageContents.$inferSelect;

test.describe.configure({ mode: "serial" });

test.describe("T11 admin cms", () => {
  let snapshot: AboutRow | null = null;

  test.beforeAll(async () => {
    const row = await testDb.query.aboutPageContents.findFirst({
      where: and(
        eq(schema.aboutPageContents.storeId, TEST_STORE_ID),
        eq(schema.aboutPageContents.locale, "en"),
      ),
    });
    snapshot = row ?? null;
  });

  test.afterAll(async () => {
    if (!snapshot) return;
    await testDb
      .update(schema.aboutPageContents)
      .set({
        eyebrow: snapshot.eyebrow,
        title: snapshot.title,
        subtitle: snapshot.subtitle,
        storyTitle: snapshot.storyTitle,
        storyBody: snapshot.storyBody,
        valuesTitle: snapshot.valuesTitle,
        valuesBody: snapshot.valuesBody,
      })
      .where(eq(schema.aboutPageContents.id, snapshot.id));
  });

  test("admin edits About EN eyebrow and public /en/about reflects it", async ({
    browser,
    page,
  }) => {
    const marker = `e2e-eyebrow-${Date.now().toString(36)}`;

    await page.goto("/admin/pages/about?locale=en");
    const eyebrowInput = page.locator('input[name="eyebrow"]');
    await expect(eyebrowInput).toBeVisible({ timeout: 10_000 });
    await eyebrowInput.fill(marker);
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(
      page.getByText(/about page updated/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    // DB assert
    const row = await testDb.query.aboutPageContents.findFirst({
      where: and(
        eq(schema.aboutPageContents.storeId, TEST_STORE_ID),
        eq(schema.aboutPageContents.locale, "en"),
      ),
    });
    expect(row?.eyebrow).toBe(marker);

    // Storefront anon assert
    const anonCtx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonPage = await anonCtx.newPage();
      await anonPage.goto("/en/about");
      await expect(anonPage.getByText(marker).first()).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await anonCtx.close();
    }
  });
});
