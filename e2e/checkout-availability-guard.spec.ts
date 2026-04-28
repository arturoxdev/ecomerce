import { and, eq, like } from "drizzle-orm";

import { schema, testDb } from "./fixtures/db-client";
import {
  test,
  expect,
  readTestSettings,
  upsertTestSettings,
  type Settings,
} from "./fixtures/test-context";
import {
  daysFromToday,
  selectDateRange,
  waitForAvailabilityCheck,
} from "./fixtures/storefront-helpers";

/**
 * T2 — Availability guard / protection against double-renting.
 *
 * A product with stock 1 already has a confirmed order for [D+5, D+7]. A new
 * anon customer tries to reserve the same range: the UI must show unavailable
 * and Add to Cart must stay disabled. No new order should be created.
 */

test.describe("T2 availability guard", () => {
  let settingsSnapshot: Settings;

  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeAll(async () => {
    settingsSnapshot = await readTestSettings();
    await upsertTestSettings({
      deliveryMode: "INCLUDED",
      depositPercent: "0.1000",
    });
  });

  test.afterAll(async () => {
    await upsertTestSettings({
      deliveryMode: settingsSnapshot.deliveryMode,
      deliveryFee: settingsSnapshot.deliveryFee,
      depositPercent: settingsSnapshot.depositPercent,
      themeId: settingsSnapshot.themeId,
    });
  });

  test("calendar blocks overlapping dates when stock is exhausted", async ({
    page,
    seed,
  }) => {
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      basePrice: "50.00",
      stock: 1,
    });

    const start = daysFromToday(5);
    const end = daysFromToday(7);
    await seed.createOrder({
      items: [
        {
          productId: product.id,
          quantity: 1,
          unitPrice: 50,
          start,
          end,
        },
      ],
    });

    await page.goto(`/en/catalog/${product.slug}`);
    await expect(
      page.getByRole("heading", { name: product.name }),
    ).toBeVisible();

    // Pick the same range → availability should flip to unavailable
    await selectDateRange(page, start, end);
    await waitForAvailabilityCheck(page, { expect: "unavailable" });

    const addBtn = page.getByTestId("add-to-cart-button");
    await expect(addBtn).toBeDisabled();
  });

  test("server rejects tampered cart that targets blocked dates", async ({
    page,
    seed,
  }) => {
    const category = await seed.createCategory();
    const product = await seed.createProduct({
      categoryId: category.id,
      basePrice: "60.00",
      stock: 1,
    });

    const blockedStart = daysFromToday(5);
    await seed.createOrder({
      items: [
        {
          productId: product.id,
          quantity: 1,
          unitPrice: 60,
          start: blockedStart,
          end: blockedStart,
        },
      ],
    });

    // Put a valid cart in localStorage that points to the blocked range,
    // bypassing the client-side calendar guard entirely. `placeOrder` must
    // still reject it.
    const email = `e2e-t2-${Date.now().toString(36)}@example.com`;
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    await page.goto("/en");
    await page.evaluate(
      ({ product, date }) => {
        const entry = {
          state: {
            items: [
              {
                id: crypto.randomUUID(),
                productId: product.id,
                productName: product.name,
                productSlug: product.slug,
                productPhoto: null,
                variantId: null,
                variantName: null,
                quantity: 1,
                unitPrice: 60,
                priceType: "FIXED",
                date,
                stock: 1,
              },
            ],
          },
          version: 1,
        };
        localStorage.setItem("festejos-cart", JSON.stringify(entry));
      },
      {
        product: { id: product.id, name: product.name, slug: product.slug },
        date: toIso(blockedStart),
      },
    );

    await page.goto("/en/cart");
    await expect(
      page.getByRole("heading", { name: /your cart/i }),
    ).toBeVisible();

    await page.locator("#name").fill("E2E Tamper Customer");
    await page.locator("#email").fill(email);
    await page.locator("#phone").fill("+1-555-000-2222");

    await page.getByRole("button", { name: /confirm order/i }).click();

    // The toast should surface the unavailable error and the URL must stay
    // on /cart. The sonner toaster mounts in the root layout.
    await expect(
      page.getByText(/no longer available|unavailable/i).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/en\/cart/);

    // DB: no new order was created under this email
    const ordersForTamper = await testDb
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.customerEmail, email),
          like(schema.orders.customerEmail, "e2e-%"),
        ),
      );
    expect(ordersForTamper).toHaveLength(0);
  });
});
