import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

/**
 * Formats a Date as "YYYY-MM-DD" (local time, not UTC).
 */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns a Date N days from today, at local midnight.
 */
export function daysFromToday(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

/**
 * Selects a date range on the public product detail calendar.
 * The calendar is react-day-picker v9 in range mode with enabled days exposed as `button[data-day]`.
 *
 * Contract:
 * - Assumes both `start` and `end` are within the currently-visible month. For ranges that cross
 *   months, click the "Go to next month" nav first. Most tests use D+3..D+5 to stay safe.
 * - The start/end pills in AvailabilityChecker switch the "active field" state — click Start pill
 *   first, then click the start day, then click End pill, then click end day.
 */
export async function selectDateRange(
  page: Page,
  start: Date,
  end: Date,
): Promise<void> {
  const startIso = toLocalDateString(start);
  const endIso = toLocalDateString(end);

  // Click Start pill to set activeField = "start"
  await page
    .getByRole("button", { name: new RegExp("start date", "i") })
    .first()
    .click();

  const startButton = page
    .locator(`[data-day="${startIso}"] button`)
    .first();
  await expect(startButton).toBeVisible({ timeout: 10_000 });
  await startButton.click();

  // Click End pill
  await page
    .getByRole("button", { name: new RegExp("end date", "i") })
    .first()
    .click();

  const endButton = page.locator(`[data-day="${endIso}"] button`).first();
  await expect(endButton).toBeVisible({ timeout: 10_000 });
  await endButton.click();
}

/**
 * Waits for the `/api/availability` check to resolve and for the
 * `[data-testid="availability-status"]` element to show the expected state.
 */
export async function waitForAvailabilityCheck(
  page: Page,
  opts: { expect: "available" | "unavailable" },
): Promise<void> {
  await page.waitForResponse(
    (res) =>
      res.url().includes("/api/availability") && res.status() === 200,
    { timeout: 10_000 },
  );

  const status = page.getByTestId("availability-status");
  if (opts.expect === "available") {
    await expect(status).toContainText(/available|units/i, { timeout: 5_000 });
  } else {
    await expect(status).toContainText(/not available|no disponible/i, {
      timeout: 5_000,
    });
  }
}

export type AddToCartOptions = {
  start: Date;
  end: Date;
  variantName?: string;
};

/**
 * Full product-page flow: pick dates, wait for availability, click "Add to cart".
 * Throws if the Add to Cart button is still disabled after availability resolves.
 */
export async function addToCartFromProductPage(
  page: Page,
  opts: AddToCartOptions,
): Promise<void> {
  if (opts.variantName) {
    await page
      .getByRole("button", { name: opts.variantName, exact: true })
      .first()
      .click();
  }

  await selectDateRange(page, opts.start, opts.end);
  await waitForAvailabilityCheck(page, { expect: "available" });

  const addBtn = page.getByTestId("add-to-cart-button");
  await expect(addBtn).toBeEnabled({ timeout: 10_000 });
  await addBtn.click();

  await expect(page.getByText(/added to cart/i).first()).toBeVisible({
    timeout: 5_000,
  });
}

export type CheckoutFormData = {
  name: string;
  email: string;
  phone: string;
  address?: string;
};

export async function fillCheckoutForm(
  page: Page,
  data: CheckoutFormData,
): Promise<void> {
  await page.locator("#name").fill(data.name);
  await page.locator("#email").fill(data.email);
  await page.locator("#phone").fill(data.phone);
  if (data.address) {
    await page.locator("#address").fill(data.address);
  }
}

/**
 * Clicks "Confirm Order" and waits for redirect to `/en/order/{id}`.
 * Returns the order id.
 */
export async function submitOrder(page: Page): Promise<string> {
  await page.getByRole("button", { name: /confirm order/i }).click();
  await page.waitForURL(/\/(en|es)\/order\/[0-9a-f-]+/, { timeout: 15_000 });
  const url = page.url();
  const match = url.match(/\/order\/([0-9a-f-]+)/);
  if (!match) throw new Error(`Could not extract orderId from URL: ${url}`);
  return match[1];
}

/**
 * Opens a fresh browser context authenticated as admin (reuses the shared auth state).
 * Caller must `.close()` it.
 */
export async function newAdminContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ storageState: "e2e/.auth/admin.json" });
}
