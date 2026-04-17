import { eq } from "drizzle-orm";

import { schema, testDb } from "./fixtures/db-client";
import { test, expect } from "./fixtures/test-context";
import { uniqueSlug } from "./fixtures/seed-helpers";

/**
 * T4 — Admin product lifecycle
 *
 * Admin creates a product, then edits it to add a variant, then toggles
 * `isActive` off and confirms the storefront hides it. Re-activating it
 * brings it back.
 *
 * The spec uses the shared admin storageState (default chromium project).
 */

test.describe("T4 admin product lifecycle", () => {
  test("admin creates, edits, toggles visibility, and the storefront reflects changes", async ({
    browser,
    page,
    seed,
    tracked,
  }, testInfo) => {
    const category = await seed.createCategory();
    const productSlug = uniqueSlug("lifecycle", testInfo.workerIndex);
    const productName = `Lifecycle Product ${testInfo.workerIndex}`;

    // Create
    await page.goto("/admin/products/new");
    await expect(
      page.getByRole("heading", { name: /new product/i }),
    ).toBeVisible();

    await page.locator('input[name="name"]').fill(productName);
    // The slug field auto-fills from the name; overwrite so cleanup matches.
    await page.locator('input[name="slug"]').fill(productSlug);
    await page
      .locator('textarea[name="description"]')
      .fill("E2E lifecycle spec product");

    // Category combobox (Base UI Select). The <Label> in Field isn't linked
    // to the combobox via htmlFor, so getByRole({ name }) doesn't match.
    // Use position: the category select is the first combobox in the form.
    const comboboxes = page.locator('form [role="combobox"]');
    await comboboxes.nth(0).click();
    await page.getByRole("option", { name: category.name }).click();

    await page.locator('input[name="basePrice"]').fill("75.00");
    await page.locator('input[name="stock"]').fill("3");

    await page.getByRole("button", { name: /save product/i }).click();

    await page.waitForURL(/\/admin\/products$/, { timeout: 15_000 });

    // Find the freshly-created product in DB and track it so cleanup runs.
    const created = await testDb.query.products.findFirst({
      where: eq(schema.products.slug, productSlug),
    });
    expect(created).toBeDefined();
    tracked.productIds.push(created!.id);

    // Edit + add a variant. The tab copy is "Variants" but the buttons say
    // "Add variation" (VariantManager component).
    await page.goto(`/admin/products/${created!.id}/edit`);
    await page.getByRole("tab", { name: /variants/i }).click();

    await page.getByRole("button", { name: /add variation/i }).click();

    const variantName = "E2E Small";
    // Scope inputs to the inline variant form (last input[name="name"])
    // so we don't touch the outer product name field.
    await page.locator('input[name="name"]').last().fill(variantName);
    await page.locator('input[name="price"]').last().fill("80.00");
    await page.locator('input[name="stock"]').last().fill("2");
    // The inline form's submit button has the same label as the "open" button,
    // but after clicking "Add variation" once the old button is gone and only
    // the submit + cancel remain inside the inline form.
    await page
      .getByRole("button", { name: /add variation/i })
      .click();

    await expect(page.getByText(variantName).first()).toBeVisible({
      timeout: 10_000,
    });

    const variantInDb = await testDb
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, created!.id));
    expect(variantInDb.length).toBeGreaterThanOrEqual(1);

    // Deactivate via the Active checkbox + Save
    await page.getByRole("tab", { name: /basic info/i }).click();
    const activeCheckbox = page.locator('input[id="isActive"]');
    if (await activeCheckbox.isChecked()) {
      await activeCheckbox.uncheck();
    }
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByText(/product saved/i).first()).toBeVisible({
      timeout: 5_000,
    });

    const deactivatedRow = await testDb.query.products.findFirst({
      where: eq(schema.products.id, created!.id),
    });
    expect(deactivatedRow?.isActive).toBe(false);

    // Storefront anon: inactive product returns 404
    const anonContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonPage = await anonContext.newPage();
      const response = await anonPage.goto(`/en/catalog/${productSlug}`);
      expect(response?.status()).toBe(404);
    } finally {
      await anonContext.close();
    }

    // Reactivate
    await page.goto(`/admin/products/${created!.id}/edit`);
    const activeCheckbox2 = page.locator('input[id="isActive"]');
    if (!(await activeCheckbox2.isChecked())) {
      await activeCheckbox2.check();
    }
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByText(/product saved/i).first()).toBeVisible({
      timeout: 5_000,
    });

    const reactivatedRow = await testDb.query.products.findFirst({
      where: eq(schema.products.id, created!.id),
    });
    expect(reactivatedRow?.isActive).toBe(true);

    const anonContext2 = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const anonPage = await anonContext2.newPage();
      await anonPage.goto(`/en/catalog/${productSlug}`);
      await expect(
        anonPage.getByRole("heading", { name: productName }),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await anonContext2.close();
    }
  });
});
