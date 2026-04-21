import { eq } from "drizzle-orm";

import { schema, testDb } from "./fixtures/db-client";
import { test, expect } from "./fixtures/test-context";
import { uniqueSlug } from "./fixtures/seed-helpers";

/**
 * T6 — Admin categories CRUD + reordering
 *
 * Creates two e2e categories with very high `sortOrder` so they land at the
 * bottom of the table regardless of real data. Then:
 *  - swap their order via the ChevronUp/Down buttons,
 *  - edit one's name via the edit page,
 *  - delete one via the AlertDialog confirmation.
 */

test.describe.configure({ mode: "serial" });

test.describe("T6 admin categories", () => {
  test("create + reorder + edit + delete from the admin table", async ({
    page,
    seed,
  }, testInfo) => {
    const w = testInfo.workerIndex;
    // Anchor at very high sortOrder so they stay adjacent at the table tail.
    const catA = await seed.createCategory({
      slug: uniqueSlug("cat-a", w),
      name: `E2E Category Alpha ${w}-${Date.now()}`,
      sortOrder: 99_990,
    });
    const catB = await seed.createCategory({
      slug: uniqueSlug("cat-b", w),
      name: `E2E Category Beta ${w}-${Date.now()}`,
      sortOrder: 99_991,
    });

    // ─── Read the table and confirm both rows exist ─────────────────────
    await page.goto("/admin/categories");

    const rowA = page.getByRole("row").filter({ hasText: catA.name });
    const rowB = page.getByRole("row").filter({ hasText: catB.name });
    await expect(rowA).toBeVisible({ timeout: 10_000 });
    await expect(rowB).toBeVisible();

    // ─── Reorder: move A down so its sortOrder becomes > B's ────────────
    // `handleReorder(index, "down")` swaps the sortOrder of adjacent rows.
    // The rows are sorted ascending by sortOrder so A is immediately before B.
    const downButton = rowA.getByRole("button").nth(1); // [up, down] → down is index 1
    await downButton.click();

    await expect
      .poll(
        async () => {
          const fresh = await testDb.query.categories.findFirst({
            where: eq(schema.categories.id, catA.id),
          });
          return fresh?.sortOrder;
        },
        { timeout: 5_000 },
      )
      .toBe(99_991);

    const catBAfter = await testDb.query.categories.findFirst({
      where: eq(schema.categories.id, catB.id),
    });
    expect(catBAfter?.sortOrder).toBe(99_990);

    // ─── Edit: change name via the edit form ────────────────────────────
    await page.goto(`/admin/categories/${catA.id}/edit`);
    const renamedName = `${catA.name} (renamed)`;
    await page.locator('input[name="name"]').fill(renamedName);
    await page.getByRole("button", { name: /save category/i }).click();
    await page.waitForURL(/\/admin\/categories$/, { timeout: 10_000 });

    const renamedRow = await testDb.query.categories.findFirst({
      where: eq(schema.categories.id, catA.id),
    });
    expect(renamedRow?.name).toBe(renamedName);

    // ─── Delete: trash button + AlertDialog confirmation ─────────────────
    const rowB2 = page.getByRole("row").filter({ hasText: catB.name });
    await expect(rowB2).toBeVisible();
    // Buttons in the row: [ChevronUp, ChevronDown, Trash]. The edit "button"
    // is actually rendered as a link (Base UI Button with render={<Link />}),
    // so it doesn't count toward getByRole("button").
    const trashButton = rowB2.getByRole("button").nth(2);
    await trashButton.click();
    await page.getByRole("button", { name: /^delete$/i }).click();

    await expect
      .poll(async () => {
        const stillThere = await testDb.query.categories.findFirst({
          where: eq(schema.categories.id, catB.id),
        });
        return stillThere;
      })
      .toBeUndefined();
  });
});
