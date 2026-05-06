const ADMIN_LOCALE = "es";
const ADMIN_CURRENCY = "USD";

const dateFormatter = new Intl.DateTimeFormat(ADMIN_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(ADMIN_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat(ADMIN_LOCALE, {
  style: "currency",
  currency: ADMIN_CURRENCY,
  currencyDisplay: "code",
});

export function formatAdminDate(date: Date | string | number): string {
  return dateFormatter.format(new Date(date));
}

export function formatAdminDateTime(date: Date | string | number): string {
  return dateTimeFormatter.format(new Date(date));
}

export function formatAdminCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}
